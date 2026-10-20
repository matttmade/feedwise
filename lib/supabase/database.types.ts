
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "activity": {
                  Row: {
                    "cards_reviewed": number,"day": string,"items_read": number,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "cards_reviewed"?: number,"day": string,"items_read"?: number,"user_id": string
                  }
                  Update: {
                    "cards_reviewed"?: number,"day"?: string,"items_read"?: number,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"cards": {
                  Row: {
                    "answer": string,"fsrs": NonNullable<Json>,"highlight_id": string,"id": string,"last_review_at": string | null,"prompt": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "answer": string,"fsrs": NonNullable<Json>,"highlight_id": string,"id"?: string,"last_review_at"?: string | null,"prompt": string,"user_id": string
                  }
                  Update: {
                    "answer"?: string,"fsrs"?: NonNullable<Json>,"highlight_id"?: string,"id"?: string,"last_review_at"?: string | null,"prompt"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "cards_highlight_id_fkey"
      columns: ["highlight_id"]
isOneToOne: false
      referencedRelation: "highlights"
      referencedColumns: ["id"]
    }
                  ]
                },"highlights": {
                  Row: {
                    "created_at": string,"id": string,"image_url": string | null,"item_id": string,"note": string | null,"text": string | null,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"image_url"?: string | null,"item_id": string,"note"?: string | null,"text"?: string | null,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"image_url"?: string | null,"item_id"?: string,"note"?: string | null,"text"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "highlights_item_id_fkey"
      columns: ["item_id"]
isOneToOne: false
      referencedRelation: "feed_items"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "highlights_item_id_fkey"
      columns: ["item_id"]
isOneToOne: false
      referencedRelation: "items"
      referencedColumns: ["id"]
    }
                  ]
                },"items": {
                  Row: {
                    "body_html": string | null,"created_at": string,"duration_seconds": number | null,"embed_html": string | null,"guid": string,"id": string,"lead_image_height": number | null,"lead_image_url": string | null,"lead_image_width": number | null,"media": NonNullable<Json>,"published_at": string | null,"read_minutes": number | null,"source_id": string,"summary": string | null,"title": string,"type": Database["public"]['Enums']["item_type"],"url": string
                  }
                  ComputedFields: never
                  Insert: {
                    "body_html"?: string | null,"created_at"?: string,"duration_seconds"?: number | null,"embed_html"?: string | null,"guid": string,"id"?: string,"lead_image_height"?: number | null,"lead_image_url"?: string | null,"lead_image_width"?: number | null,"media"?: NonNullable<Json>,"published_at"?: string | null,"read_minutes"?: number | null,"source_id": string,"summary"?: string | null,"title": string,"type"?: Database["public"]['Enums']["item_type"],"url": string
                  }
                  Update: {
                    "body_html"?: string | null,"created_at"?: string,"duration_seconds"?: number | null,"embed_html"?: string | null,"guid"?: string,"id"?: string,"lead_image_height"?: number | null,"lead_image_url"?: string | null,"lead_image_width"?: number | null,"media"?: NonNullable<Json>,"published_at"?: string | null,"read_minutes"?: number | null,"source_id"?: string,"summary"?: string | null,"title"?: string,"type"?: Database["public"]['Enums']["item_type"],"url"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "items_source_id_fkey"
      columns: ["source_id"]
isOneToOne: false
      referencedRelation: "sources"
      referencedColumns: ["id"]
    }
                  ]
                },"reviews": {
                  Row: {
                    "card_id": string,"id": string,"rating": Database["public"]['Enums']["review_rating"],"reviewed_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "card_id": string,"id"?: string,"rating": Database["public"]['Enums']["review_rating"],"reviewed_at"?: string
                  }
                  Update: {
                    "card_id"?: string,"id"?: string,"rating"?: Database["public"]['Enums']["review_rating"],"reviewed_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "reviews_card_id_fkey"
      columns: ["card_id"]
isOneToOne: false
      referencedRelation: "cards"
      referencedColumns: ["id"]
    }
                  ]
                },"settings": {
                  Row: {
                    "autoplay": boolean,"calm_mode": boolean,"captions": boolean,"daily_goal": number,"density": string,"motion": Database["public"]['Enums']["motion_pref"],"review_cap": number,"text_size": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "autoplay"?: boolean,"calm_mode"?: boolean,"captions"?: boolean,"daily_goal"?: number,"density"?: string,"motion"?: Database["public"]['Enums']["motion_pref"],"review_cap"?: number,"text_size"?: string,"user_id": string
                  }
                  Update: {
                    "autoplay"?: boolean,"calm_mode"?: boolean,"captions"?: boolean,"daily_goal"?: number,"density"?: string,"motion"?: Database["public"]['Enums']["motion_pref"],"review_cap"?: number,"text_size"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"sources": {
                  Row: {
                    "etag": string | null,"feed_type": string,"feed_url": string,"icon_url": string | null,"id": string,"last_error": string | null,"last_fetched_at": string | null,"last_modified": string | null,"last_status": string | null,"muted": boolean,"site_url": string,"title": string | null,"topic_ids": (string)[],"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "etag"?: string | null,"feed_type": string,"feed_url": string,"icon_url"?: string | null,"id"?: string,"last_error"?: string | null,"last_fetched_at"?: string | null,"last_modified"?: string | null,"last_status"?: string | null,"muted"?: boolean,"site_url": string,"title"?: string | null,"topic_ids"?: (string)[],"user_id": string
                  }
                  Update: {
                    "etag"?: string | null,"feed_type"?: string,"feed_url"?: string,"icon_url"?: string | null,"id"?: string,"last_error"?: string | null,"last_fetched_at"?: string | null,"last_modified"?: string | null,"last_status"?: string | null,"muted"?: boolean,"site_url"?: string,"title"?: string | null,"topic_ids"?: (string)[],"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"topics": {
                  Row: {
                    "color": string | null,"icon": string | null,"id": string,"name": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "color"?: string | null,"icon"?: string | null,"id"?: string,"name": string,"user_id": string
                  }
                  Update: {
                    "color"?: string | null,"icon"?: string | null,"id"?: string,"name"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"user_items": {
                  Row: {
                    "item_id": string,"kept_at": string | null,"last_opened_at": string | null,"resume_position": number | null,"state": Database["public"]['Enums']["user_item_state"],"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "item_id": string,"kept_at"?: string | null,"last_opened_at"?: string | null,"resume_position"?: number | null,"state"?: Database["public"]['Enums']["user_item_state"],"user_id": string
                  }
                  Update: {
                    "item_id"?: string,"kept_at"?: string | null,"last_opened_at"?: string | null,"resume_position"?: number | null,"state"?: Database["public"]['Enums']["user_item_state"],"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "user_items_item_id_fkey"
      columns: ["item_id"]
isOneToOne: false
      referencedRelation: "feed_items"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "user_items_item_id_fkey"
      columns: ["item_id"]
isOneToOne: false
      referencedRelation: "items"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            "feed_items": {
                  Row: {
                    "created_at": string | null,"duration_seconds": number | null,"id": string | null,"kept_at": string | null,"last_opened_at": string | null,"lead_image_height": number | null,"lead_image_url": string | null,"lead_image_width": number | null,"muted": boolean | null,"published_at": string | null,"read_minutes": number | null,"resume_position": number | null,"sort_at": string | null,"source_id": string | null,"source_site_url": string | null,"source_title": string | null,"state": Database["public"]['Enums']["user_item_state"] | null,"summary": string | null,"title": string | null,"topic_ids": (string)[] | null,"type": Database["public"]['Enums']["item_type"] | null,"url": string | null
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "items_source_id_fkey"
      columns: ["source_id"]
isOneToOne: false
      referencedRelation: "sources"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Functions: {
            [_ in never]: never
          }
          Enums: {
            "item_type": "article"|"video"|"image_set","motion_pref": "off"|"reduced"|"full","review_rating": "again"|"hard"|"good","user_item_state": "new"|"skipped"|"kept"|"read"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "item_type": ["article", "video", "image_set"],"motion_pref": ["off", "reduced", "full"],"review_rating": ["again", "hard", "good"],"user_item_state": ["new", "skipped", "kept", "read"]
          }
        }
} as const
