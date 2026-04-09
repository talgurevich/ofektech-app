"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Camera,
  Check,
  Loader2,
  User,
  Briefcase,
  GraduationCap,
} from "lucide-react";
import type { UserRole } from "@/lib/types";

interface ProfileData {
  phone: string;
  motto: string;
  linkedin_url: string;
  bio: string;
  venture_role: string;
  company: string;
  expertise: string;
  avatar_url: string;
}

const emptyProfile: ProfileData = {
  phone: "",
  motto: "",
  linkedin_url: "",
  bio: "",
  venture_role: "",
  company: "",
  expertise: "",
  avatar_url: "",
};

export default function ProfilePage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [fullName, setFullName] = useState("");
  const [profile, setProfile] = useState<ProfileData>(emptyProfile);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const { data } = await supabase
        .from("profiles")
        .select(
          "role, full_name, phone, motto, linkedin_url, bio, venture_role, company, expertise, avatar_url"
        )
        .eq("id", user.id)
        .single();

      if (data) {
        setRole(data.role as UserRole);
        setFullName(data.full_name || "");
        setProfile({
          phone: data.phone || "",
          motto: data.motto || "",
          linkedin_url: data.linkedin_url || "",
          bio: data.bio || "",
          venture_role: data.venture_role || "",
          company: data.company || "",
          expertise: data.expertise || "",
          avatar_url: data.avatar_url || "",
        });
      }
      setLoading(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveProfile = useCallback(
    async (data: Partial<ProfileData>) => {
      if (!userId) return;
      setSaving(true);
      setSaved(false);

      await supabase.from("profiles").update(data).eq("id", userId);

      setSaving(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
    [userId, supabase]
  );

  const handleChange = useCallback(
    (field: keyof ProfileData, value: string) => {
      setProfile((prev) => ({ ...prev, [field]: value }));
      setSaved(false);

      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(() => {
        saveProfile({ [field]: value });
      }, 1000);
    },
    [saveProfile]
  );

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;

    if (file.size > 2 * 1024 * 1024) {
      alert("הקובץ גדול מדי. גודל מקסימלי: 2MB");
      return;
    }

    setUploading(true);
    const ext = file.name.split(".").pop() || "jpg";
    const filePath = `${userId}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      setUploading(false);
      return;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("avatars").getPublicUrl(filePath);

    // Add cache-busting param
    const avatarUrl = `${publicUrl}?t=${Date.now()}`;

    setProfile((prev) => ({ ...prev, avatar_url: avatarUrl }));
    await saveProfile({ avatar_url: avatarUrl });
    setUploading(false);
  };

  const initials = fullName
    ? fullName.charAt(0).toUpperCase()
    : "?";

  if (loading) {
    return (
      <main className="max-w-2xl mx-auto p-4 md:p-8">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="size-6 animate-spin text-gray-400" />
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-2xl mx-auto p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#1a2744]">הפרופיל שלי</h1>
        <div className="flex items-center gap-2 text-sm">
          {saving && (
            <Badge variant="secondary" className="gap-1">
              <Loader2 className="size-3 animate-spin" />
              שומר...
            </Badge>
          )}
          {saved && (
            <Badge className="bg-[#22c55e]/10 text-[#22c55e] border-0 gap-1">
              <Check className="size-3" />
              נשמר
            </Badge>
          )}
        </div>
      </div>

      {/* Avatar section */}
      <div className="flex flex-col items-center gap-3">
        <div className="relative">
          {profile.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={fullName}
              className="size-24 rounded-full object-cover ring-2 ring-gray-100"
            />
          ) : (
            <div className="flex size-24 items-center justify-center rounded-full bg-[#22c55e]/20 ring-2 ring-gray-100">
              <span className="text-3xl font-bold text-[#22c55e]">
                {initials}
              </span>
            </div>
          )}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="absolute bottom-0 left-0 flex size-8 items-center justify-center rounded-full bg-[#1a2744] text-white shadow-md hover:bg-[#1a2744]/90 transition-colors disabled:opacity-50"
          >
            {uploading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Camera className="size-4" />
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarUpload}
          />
        </div>
        <p className="text-lg font-semibold text-[#1a2744]">{fullName}</p>
      </div>

      {/* Card 1: Personal details */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[#1a2744] text-base">
            <User className="size-4" />
            פרטים אישיים
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="phone">טלפון</Label>
            <Input
              id="phone"
              dir="ltr"
              placeholder="050-000-0000"
              value={profile.phone}
              onChange={(e) => handleChange("phone", e.target.value)}
              className="rounded-xl"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="motto">משפט השראה</Label>
            <Input
              id="motto"
              placeholder="משפט השראה..."
              value={profile.motto}
              onChange={(e) => handleChange("motto", e.target.value)}
              className="rounded-xl"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="linkedin">LinkedIn</Label>
            <Input
              id="linkedin"
              dir="ltr"
              placeholder="https://linkedin.com/in/..."
              value={profile.linkedin_url}
              onChange={(e) => handleChange("linkedin_url", e.target.value)}
              className="rounded-xl"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">ביו</Label>
            <textarea
              id="bio"
              rows={3}
              placeholder="ספרו על עצמכם..."
              value={profile.bio}
              onChange={(e) => handleChange("bio", e.target.value)}
              className="flex w-full rounded-xl border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 resize-none"
            />
          </div>
        </CardContent>
      </Card>

      {/* Card 2: Role-specific */}
      {role === "candidate" && (
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[#1a2744] text-base">
              <GraduationCap className="size-4" />
              פרטי מיזם
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="venture_role">תפקיד במיזם</Label>
              <Input
                id="venture_role"
                placeholder="CEO, CTO, מייסד/ת..."
                value={profile.venture_role}
                onChange={(e) =>
                  handleChange("venture_role", e.target.value)
                }
                className="rounded-xl"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {role === "mentor" && (
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[#1a2744] text-base">
              <Briefcase className="size-4" />
              פרטים מקצועיים
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="company">חברה / ארגון</Label>
              <Input
                id="company"
                placeholder="שם החברה / ארגון"
                value={profile.company}
                onChange={(e) => handleChange("company", e.target.value)}
                className="rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="expertise">תחום מומחיות</Label>
              <Input
                id="expertise"
                placeholder="תחום מומחיות"
                value={profile.expertise}
                onChange={(e) => handleChange("expertise", e.target.value)}
                className="rounded-xl"
              />
            </div>
          </CardContent>
        </Card>
      )}
    </main>
  );
}
