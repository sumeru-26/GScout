"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { QrCodeScanner } from "@/components/qr-code-scanner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function normalizeIconButtonKind(value: unknown): value is "icon-button" {
  if (typeof value !== "string") return false;

  const normalized = value.toLowerCase();
  return (
    normalized === "icon" ||
    normalized === "icon-button" ||
    normalized === "iconbutton" ||
    normalized === "icon_button"
  );
}

function toLucideExportName(iconName: string) {
  return iconName
    .trim()
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join("");
}

function extractPayloadItems(payload: unknown): unknown[] {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (typeof payload !== "object") return [];

  const source = payload as {
    items?: unknown;
    editorState?: {
      items?: unknown;
    };
  };

  if (Array.isArray(source.items)) return source.items;
  if (Array.isArray(source.editorState?.items)) return source.editorState.items;
  return [];
}

function extractIconNamesFromPayload(payload: unknown): string[] {
  const items = extractPayloadItems(payload);

  const iconNames = items
    .filter(
      (item): item is Record<string, unknown> => Boolean(item && typeof item === "object")
    )
    .filter((item) => normalizeIconButtonKind(item.kind) || normalizeIconButtonKind(item.type))
    .map((item) => item.iconName)
    .filter((iconName): iconName is string => typeof iconName === "string" && iconName.trim().length > 0)
    .map((iconName) => iconName.trim().toLowerCase());

  return [...new Set(iconNames)];
}

async function preloadPayloadIcons(payload: unknown) {
  const iconNames = extractIconNamesFromPayload(payload);
  if (iconNames.length === 0) return;

  const lucideIcons = (await import("lucide-react")) as Record<string, unknown>;
  iconNames.forEach((name) => {
    const exportName = toLucideExportName(name);
    void lucideIcons[exportName];
  });
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="flex min-h-screen items-center justify-center p-6 lg:p-12">
        <LoginCard />
      </div>
    </div>
  );
}

function LoginCard() {
  const router = useRouter();
  const [loginCode, setLoginCode] = React.useState("");
  const [scouterName, setScouterName] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const isFormComplete = Boolean(loginCode.trim() && scouterName.trim());

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedLoginCode = loginCode.trim();
    const trimmedScouterName = scouterName.trim();
    if (!trimmedLoginCode || !trimmedScouterName) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/login/validate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ loginCode: trimmedLoginCode }),
      });

      if (!response.ok) {
        toast.error("Invalid login code");
        return;
      }

      const result = (await response.json()) as {
        valid?: boolean;
        payload?: unknown;
        backgroundImage?: string | null;
        eventKey?: string | null;
        eventSchedule?: unknown;
      };

      if (!result.valid) {
        toast.error("Invalid login code");
        return;
      }

      localStorage.setItem("loggedIn", "true");
      localStorage.setItem("loginCode", trimmedLoginCode);
      localStorage.setItem("scouterName", trimmedScouterName);
      localStorage.setItem("payload", JSON.stringify(result.payload ?? null));
      localStorage.setItem("backgroundImage", result.backgroundImage ?? "");
      localStorage.setItem("eventKey", result.eventKey ?? "");
      localStorage.setItem("eventSchedule", JSON.stringify(result.eventSchedule ?? null));
      localStorage.setItem("tbaEventMatchesSimple", JSON.stringify(result.eventSchedule ?? null));

      await preloadPayloadIcons(result.payload);

      router.push("/scout");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitting) {
    return (
      <div className="flex min-h-72 flex-col items-center justify-center gap-3 text-center">
        <div className="text-lg font-semibold">Loading Event Data</div>
        <p className="text-muted-foreground text-sm">
          Fetching match schedule before opening scouting.
        </p>
      </div>
    );
  }

  return (
    <Card className="w-full max-w-md border-white/15 bg-slate-900/90">
      <CardHeader className="space-y-2 text-center">
        <CardTitle className="text-2xl">Scouter Login</CardTitle>
        <CardDescription>
          Enter your login code and scouter name to continue.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form className="grid gap-4" onSubmit={handleSubmit}>
          <div className="grid gap-2">
            <Label htmlFor="login-code" className="text-xs text-white/80">Login Code</Label>
            <Input
              id="login-code"
              name="loginCode"
              placeholder="Enter your code"
              autoComplete="one-time-code"
              value={loginCode}
              onChange={(event) => setLoginCode(event.target.value)}
              className="border-white/15 bg-slate-900/90 text-white placeholder:text-white/55"
            />
            <QrCodeScanner onScan={setLoginCode} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="scouter-name" className="text-xs text-white/80">Scouter Name</Label>
            <Input
              id="scouter-name"
              name="scouterName"
              placeholder="Your name"
              autoComplete="name"
              value={scouterName}
              onChange={(event) => setScouterName(event.target.value)}
              className="border-white/15 bg-slate-900/90 text-white placeholder:text-white/55"
            />
          </div>
          <Button
            className="w-full"
            type="submit"
            disabled={!isFormComplete || isSubmitting}
          >
            Sign in
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
