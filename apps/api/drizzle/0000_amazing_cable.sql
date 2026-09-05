CREATE TABLE "favorites" (
	"user_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "favorites_user_id_project_id_pk" PRIMARY KEY("user_id","project_id")
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"subject" text NOT NULL,
	"description" text,
	"keywords" text[] DEFAULT '{}' NOT NULL,
	"cover_url" text,
	"cover_key" text NOT NULL,
	"price_minor" integer NOT NULL,
	"currency" text DEFAULT 'RUB' NOT NULL,
	"included_materials" text[] DEFAULT '{}' NOT NULL,
	"purchase_count" integer DEFAULT 0 NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"is_published" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"telegram_id" bigint NOT NULL,
	"username" text,
	"telegram_name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "favorites_project_idx" ON "favorites" USING btree ("project_id");--> statement-breakpoint
CREATE UNIQUE INDEX "projects_slug_uq" ON "projects" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "projects_catalog_idx" ON "projects" USING btree ("is_published","subject","featured");--> statement-breakpoint
CREATE UNIQUE INDEX "users_telegram_id_uq" ON "users" USING btree ("telegram_id");