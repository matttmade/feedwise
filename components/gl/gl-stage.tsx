"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { stepFollowers, type Followers } from "@/lib/motion/followers";
import { useMotion } from "@/lib/motion/use-motion";
import { coverScale, easeOutExpo, lerpRect, nearViewport, type Rect } from "@/lib/gl/rect";

const DIVE_KEY = "fw-dive";
const DIVE_MS = 650;
const BEND_PX = 48;

const VERTEX = /* glsl */ `
attribute vec3 position;
attribute vec2 uv;
uniform vec4 uRect;
uniform vec2 uViewport;
uniform float uBend;
varying vec2 vUv;
void main() {
  vUv = uv;
  vec2 p = uRect.xy + vec2(position.x + 0.5, 0.5 - position.y) * uRect.zw;
  p.y += uBend * sin(uv.x * 3.14159265);
  gl_Position = vec4(p.x / uViewport.x * 2.0 - 1.0, 1.0 - p.y / uViewport.y * 2.0, 0.0, 1.0);
}`;

const FRAGMENT = /* glsl */ `
precision highp float;
uniform sampler2D tMap;
uniform vec2 uCover;
uniform float uColor;
varying vec2 vUv;
void main() {
  vec4 c = texture2D(tMap, (vUv - 0.5) * uCover + 0.5);
  float g = dot(c.rgb, vec3(0.299, 0.587, 0.114));
  gl_FragColor = vec4(mix(vec3(g) * 0.82, c.rgb, uColor), 1.0);
}`;

type Anim = { from: Rect; to: Rect; start: number; done: () => void };

/**
 * One WebGL canvas behind the page that draws every framed item image (`[data-gl]`) where
 * its <img> sits. Three effects: images rest in grayscale and come into colour on hover or
 * focus (on touch screens, the one nearest the middle); they bend slightly with scroll
 * velocity; and opening an item grows its image to fill the screen, shrinking back into
 * place on return. Reads scroll, never sets it. Full motion only; otherwise, or without
 * WebGL, the plain <img> elements show as usual.
 */
export function GlStage() {
  const motion = useMotion();
  const router = useRouter();
  useEffect(() => {
    if (motion !== "full") return;
    // A fresh canvas every time: Next keeps this layout alive across navigations and re-runs
    // the effect on return, and a canvas whose context was released can't be drawn on again.
    const canvas = document.createElement("canvas");
    canvas.className = "gl-stage";
    canvas.setAttribute("aria-hidden", "true");
    document.body.prepend(canvas);
    let stop = () => {};
    let cancelled = false;

    import("ogl").then(({ Renderer, Program, Mesh, Plane, Texture, Camera, Transform }) => {
      if (cancelled) return;
      let renderer: InstanceType<typeof Renderer>;
      try {
        renderer = new Renderer({
          canvas,
          dpr: Math.min(window.devicePixelRatio, 2),
          alpha: true,
          antialias: true,
          webgl: 2,
        });
      } catch {
        return;
      }
      const gl = renderer.gl;
      if (!gl) return;
      const root = document.documentElement;
      root.classList.add("gl-on");

      const scene = new Transform();
      const camera = new Camera(gl);
      const geometry = new Plane(gl, { widthSegments: 24, heightSegments: 1 });
      const touch = !window.matchMedia("(hover: hover)").matches;

      type Entry = {
        el: HTMLElement;
        img: HTMLImageElement | null;
        mesh: InstanceType<typeof Mesh>;
        program: InstanceType<typeof Program>;
        texture: InstanceType<typeof Texture>;
        ready: boolean;
        color: number;
        anim?: Anim;
      };
      const entries = new Map<HTMLElement, Entry>();
      let hovered: Element | null = null;
      let focused: Element | null = null;
      let follow: Followers = { fast: window.scrollY, slow: window.scrollY };
      let frame = 0;
      let last = 0;
      let vw = 0;
      let vh = 0;

      const resize = () => {
        vw = window.innerWidth;
        vh = window.innerHeight;
        renderer.setSize(vw, vh);
        wake();
      };

      const add = (el: HTMLElement) => {
        const texture = new Texture(gl, { generateMipmaps: false });
        const program = new Program(gl, {
          vertex: VERTEX,
          fragment: FRAGMENT,
          // Flat 2D layers: draw order decides what's on top, not depth.
          depthTest: false,
          depthWrite: false,
          uniforms: {
            tMap: { value: texture },
            uRect: { value: [0, 0, 1, 1] },
            uViewport: { value: [1, 1] },
            uBend: { value: 0 },
            uCover: { value: [1, 1] },
            uColor: { value: 0 },
          },
        });
        const mesh = new Mesh(gl, { geometry, program });
        mesh.visible = false;
        mesh.setParent(scene);
        entries.set(el, { el, img: null, mesh, program, texture, ready: false, color: 0 });
      };

      const scan = () => {
        document.querySelectorAll<HTMLElement>("[data-gl]").forEach((el) => {
          if (!entries.has(el)) add(el);
        });
        for (const [el, e] of entries) {
          if (el.isConnected) continue;
          e.mesh.setParent(null);
          e.program.remove();
          entries.delete(el);
        }
        wake();
      };

      /** Load the texture from the <img> the browser already fetched (same-origin proxy). */
      const load = (e: Entry) => {
        if (e.ready) return;
        const img = e.el.querySelector<HTMLImageElement>("img.img-fill");
        if (!img || !img.complete || !img.naturalWidth) {
          img?.addEventListener("load", wake, { once: true });
          return;
        }
        e.img = img;
        e.texture.image = img;
        e.ready = true;
        e.el.dataset.glReady = "";
      };

      const rectOf = (el: Element): Rect => {
        const r = el.getBoundingClientRect();
        return { x: r.left, y: r.top, w: r.width, h: r.height };
      };

      /** Which card should be in colour: the hovered or focused one, or on touch the middle one. */
      const activeCard = () => {
        if (focused) return focused;
        if (!touch) return hovered;
        let best: Element | null = null;
        let bestD = Infinity;
        for (const e of entries.values()) {
          if (!e.ready) continue;
          const r = rectOf(e.el);
          const d = Math.abs(r.y + r.h / 2 - vh / 2);
          if (d < bestD && r.y < vh && r.y + r.h > 0) {
            bestD = d;
            best = e.el.closest(".card");
          }
        }
        return best;
      };

      const tick = (t: number) => {
        frame = 0;
        const dt = last ? Math.min(64, t - last) : 16.67;
        last = t;
        const step = stepFollowers(follow, window.scrollY, dt);
        follow = step;
        const bend = step.lean * BEND_PX;
        const active = activeCard();
        let busy = !step.settled;

        for (const e of entries.values()) {
          load(e);
          let rect = rectOf(e.el);
          if (e.anim) {
            const p = Math.min(1, (t - e.anim.start) / DIVE_MS);
            rect = lerpRect(e.anim.from, e.anim.to, easeOutExpo(p));
            busy = true;
            if (p >= 1) {
              const done = e.anim.done;
              e.anim = undefined;
              done();
            }
          }
          const visible = e.ready && (Boolean(e.anim) || nearViewport(rect, vw, vh));
          e.mesh.visible = visible;
          if (!visible || !e.img) continue;
          const target = e.anim || e.el.closest(".card") === active ? 1 : 0;
          const next = e.color + (target - e.color) * (1 - Math.exp((-dt / 16.67) * 0.12));
          if (Math.abs(next - target) > 0.002) busy = true;
          e.color = Math.abs(next - target) < 0.002 ? target : next;
          const u = e.program.uniforms;
          u.uRect.value = [rect.x, rect.y, rect.w, rect.h];
          u.uViewport.value = [vw, vh];
          u.uBend.value = e.anim ? 0 : bend;
          u.uColor.value = e.color;
          const c = coverScale(rect, { w: e.img.naturalWidth, h: e.img.naturalHeight });
          u.uCover.value = [c.x, c.y];
          e.mesh.renderOrder = e.anim ? 1 : 0;
        }
        renderer.render({ scene, camera });
        if (busy) wake();
      };

      function wake() {
        if (!frame) frame = requestAnimationFrame(tick);
      }

      /** Grow the item's plane to fill the screen, then open it. */
      const onClick = (ev: MouseEvent) => {
        if (ev.defaultPrevented || ev.button !== 0 || ev.metaKey || ev.ctrlKey || ev.shiftKey)
          return;
        const a = (ev.target as Element).closest<HTMLAnchorElement>('a[href^="/reader/"]');
        const el = a?.closest(".card")?.querySelector<HTMLElement>("[data-gl-ready]");
        const e = el ? entries.get(el) : undefined;
        if (!a || !e) return;
        ev.preventDefault();
        root.classList.add("gl-dive");
        e.anim = {
          from: rectOf(e.el),
          to: { x: 0, y: 0, w: vw, h: vh },
          start: performance.now(),
          done: () => {
            try {
              sessionStorage.setItem(DIVE_KEY, e.el.dataset.gl ?? "");
            } catch {}
            router.push(a.getAttribute("href")!);
          },
        };
        wake();
      };

      /** Coming back from an item: shrink its plane from full screen into its place. */
      const pullBack = () => {
        let id: string | null = null;
        try {
          id = sessionStorage.getItem(DIVE_KEY);
          sessionStorage.removeItem(DIVE_KEY);
        } catch {}
        if (!id) return;
        const el = document.querySelector<HTMLElement>(`[data-gl="${CSS.escape(id)}"]`);
        const e = el ? entries.get(el) : undefined;
        if (!e) return;
        const start = () => {
          load(e);
          if (!e.ready) return void setTimeout(start, 50);
          root.classList.add("gl-dive");
          e.anim = {
            from: { x: 0, y: 0, w: vw, h: vh },
            to: rectOf(e.el),
            start: performance.now(),
            done: () => root.classList.remove("gl-dive"),
          };
          wake();
        };
        start();
      };

      const onOver = (ev: Event) => {
        hovered = (ev.target as Element).closest?.(".card") ?? null;
        wake();
      };
      const onFocus = (ev: Event) => {
        focused = (ev.target as Element).closest?.(".card") ?? null;
        wake();
      };
      const onBlur = () => {
        focused = null;
        wake();
      };

      const mo = new MutationObserver(scan);
      mo.observe(document.body, { childList: true, subtree: true });
      window.addEventListener("resize", resize);
      window.addEventListener("scroll", wake, { passive: true });
      document.addEventListener("scroll", wake, { passive: true, capture: true });
      document.addEventListener("pointerover", onOver);
      document.addEventListener("focusin", onFocus);
      document.addEventListener("focusout", onBlur);
      document.addEventListener("click", onClick, true);
      resize();
      scan();
      pullBack();

      stop = () => {
        cancelAnimationFrame(frame);
        mo.disconnect();
        window.removeEventListener("resize", resize);
        window.removeEventListener("scroll", wake);
        document.removeEventListener("scroll", wake, { capture: true });
        document.removeEventListener("pointerover", onOver);
        document.removeEventListener("focusin", onFocus);
        document.removeEventListener("focusout", onBlur);
        document.removeEventListener("click", onClick, true);
        for (const el of entries.keys()) delete el.dataset.glReady;
        root.classList.remove("gl-on", "gl-dive");
        renderer.gl.getExtension("WEBGL_lose_context")?.loseContext();
        canvas.remove();
      };
    });

    return () => {
      cancelled = true;
      stop();
      canvas.remove();
    };
  }, [motion, router]);

  return null;
}
