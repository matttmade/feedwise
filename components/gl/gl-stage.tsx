"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { stepFollowers, type Followers } from "@/lib/motion/followers";
import { useMotion } from "@/lib/motion/use-motion";
import { coverScale, easeOutExpo, lerpRect, nearViewport, type Rect } from "@/lib/gl/rect";

const DIVE_KEY = "fw-dive";
const DIVE_MS = 650;
const BEND_PX = 26;
const REVEAL_MS = 1100;

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
uniform float uReveal;
// Press edition: 0–1 blend into newsprint halftone; uMis = plate drift in px; uDot = cell px.
uniform float uPress;
uniform float uMis;
uniform float uDot;
uniform vec2 uSize;
varying vec2 vUv;

const vec3 PAPER = vec3(0.922, 0.898, 0.831);
const vec3 INK = vec3(0.110, 0.102, 0.086);

// Ink coverage (0–1) of a 45° dot screen at this pixel for a given tone.
float screen(float lum, vec2 frag) {
  vec2 q = mat2(0.7071, -0.7071, 0.7071, 0.7071) * frag / uDot;
  float d = length(fract(q) - 0.5);
  float r = sqrt(clamp(1.0 - lum, 0.0, 1.0)) * 0.6;
  return 1.0 - smoothstep(r - 0.06, r + 0.06, d);
}

void main() {
  // Wipe in from the top the first time the image is seen.
  if (vUv.y < 1.0 - uReveal) discard;
  vec2 uv = (vUv - 0.5) * uCover + 0.5;
  vec4 c = texture2D(tMap, uv);
  float g = dot(c.rgb, vec3(0.299, 0.587, 0.114));
  vec3 base = mix(vec3(g) * 0.82, c.rgb, uColor);
  if (uPress < 0.001) {
    gl_FragColor = vec4(base, 1.0);
    return;
  }
  // Continuous tone printed on newsprint, with a fine dot screen as texture over it (not a
  // filter): the image stays readable, the dots show up close.
  vec3 tone = mix(PAPER, INK, clamp((1.0 - g) * 0.92, 0.0, 1.0));
  vec3 dots = mix(PAPER, INK, screen(g * 1.04, gl_FragCoord.xy));
  vec3 press = mix(tone, dots, 0.45);
  // On hover the image's own colour comes through, faintly, like a second spot ink.
  press *= mix(vec3(1.0), c.rgb / max(g, 0.05), 0.28 * uColor);
  // Cyan and magenta plates a little out of register, more while scrolling.
  vec2 off = vec2((uMis + 0.6) / uSize.x, 0.0);
  float gc = dot(texture2D(tMap, uv + off).rgb, vec3(0.299, 0.587, 0.114));
  float gm = dot(texture2D(tMap, uv - off * 0.8).rgb, vec3(0.299, 0.587, 0.114));
  press *= mix(vec3(1.0), vec3(0.62, 0.9, 1.0), (1.0 - gc) * 0.10);
  press *= mix(vec3(1.0), vec3(1.0, 0.72, 0.86), (1.0 - gm) * 0.08);
  gl_FragColor = vec4(mix(base, press, uPress), 1.0);
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
        lastY?: number;
        revealStart?: number;
        anim?: Anim;
      };
      const entries = new Map<HTMLElement, Entry>();
      let hovered: Element | null = null;
      let focused: Element | null = null;
      let follow: Followers = { fast: window.scrollY, slow: window.scrollY };
      let frame = 0;
      let last = 0;
      let press = "press" in root.dataset ? 1 : 0;
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
            uReveal: { value: 0 },
            uPress: { value: 0 },
            uMis: { value: 0 },
            uDot: { value: 4 },
            uSize: { value: [1, 1] },
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
        // Press edition fades in and out; the plate drift follows --misreg (press-motion).
        const pressTarget = "press" in root.dataset ? 1 : 0;
        press += (pressTarget - press) * (1 - Math.exp((-dt / 16.67) * 0.1));
        if (Math.abs(press - pressTarget) < 0.002) press = pressTarget;
        else busy = true;
        const mis = press ? Number(root.style.getPropertyValue("--misreg") || 0) : 0;
        if (mis) busy = true;

        for (const e of entries.values()) {
          load(e);
          let rect = rectOf(e.el);
          // Tiles with their own scroll depth keep moving after the page stops; keep drawing.
          if (e.lastY !== undefined && Math.abs(e.lastY - rect.y) > 0.1) busy = true;
          e.lastY = rect.y;
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
          // Start the wipe once the image is actually on screen, not in the preload margin.
          if (e.revealStart === undefined && rect.y < vh * 0.92 && rect.y + rect.h > 0)
            e.revealStart = t;
          const reveal = e.anim
            ? 1
            : e.revealStart === undefined
              ? 0
              : easeOutExpo(Math.min(1, (t - e.revealStart) / REVEAL_MS));
          if (reveal < 1) busy = true;
          u.uReveal.value = reveal;
          u.uPress.value = press;
          u.uMis.value = mis;
          u.uDot.value = 3 * renderer.dpr;
          u.uSize.value = [rect.w, rect.h];
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
      // Redraw when the Press edition is switched, so the halftone fades in or out.
      const pressMo = new MutationObserver(wake);
      pressMo.observe(root, { attributes: true, attributeFilter: ["data-press", "style"] });
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
        pressMo.disconnect();
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
