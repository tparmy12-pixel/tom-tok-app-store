import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Trash2, Upload } from "lucide-react";

const CATEGORIES = ["Social", "Games", "Tools", "Entertainment", "Education", "Other"];

const AppForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEdit = !!id;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [version, setVersion] = useState("1.0.0");
  const [size, setSize] = useState("");
  const [category, setCategory] = useState("Other");
  const [loading, setLoading] = useState(false);
  const [apkFile, setApkFile] = useState<File | null>(null);
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [screenshotFiles, setScreenshotFiles] = useState<File[]>([]);

  const { data: existingApp } = useQuery({
    queryKey: ["admin-app", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("apps").select("*").eq("id", id!).single();
      if (error) throw error;
      return data;
    },
    enabled: isEdit,
  });

  useEffect(() => {
    if (existingApp) {
      setName(existingApp.name);
      setDescription(existingApp.description || "");
      setVersion(existingApp.version);
      setSize(existingApp.size || "");
      setCategory(existingApp.category);
    }
  }, [existingApp]);

  const uploadFile = async (file: File, bucket: string, path: string) => {
    const { data, error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
    if (error) throw error;
    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(data.path);
    return urlData.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast.error("App name is required"); return; }
    setLoading(true);

    try {
      const appId = isEdit ? id! : crypto.randomUUID();
      let apkUrl = existingApp?.apk_url || null;
      let iconUrl = existingApp?.icon_url || null;
      let screenshots = existingApp?.screenshots || [];

      if (apkFile) {
        apkUrl = await uploadFile(apkFile, "apks", `${appId}/${apkFile.name}`);
      }
      if (iconFile) {
        iconUrl = await uploadFile(iconFile, "app-assets", `icons/${appId}.png`);
      }
      if (screenshotFiles.length > 0) {
        const urls = await Promise.all(
          screenshotFiles.map((f, i) => uploadFile(f, "app-assets", `screenshots/${appId}/${i}-${f.name}`))
        );
        screenshots = [...(screenshots || []), ...urls];
      }

      const appData = {
        name,
        description,
        version,
        size: size || (apkFile ? `${(apkFile.size / (1024 * 1024)).toFixed(1)} MB` : null),
        category,
        apk_url: apkUrl,
        icon_url: iconUrl,
        screenshots,
      };

      if (isEdit) {
        const { error } = await supabase.from("apps").update(appData).eq("id", id!);
        if (error) throw error;
        toast.success("App updated!");
      } else {
        const { error } = await supabase.from("apps").insert({ id: appId, ...appData });
        if (error) throw error;
        toast.success("App uploaded!");
      }

      queryClient.invalidateQueries({ queryKey: ["admin-apps"] });
      queryClient.invalidateQueries({ queryKey: ["apps"] });
      navigate("/admin");
    } catch (err: any) {
      toast.error(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this app permanently?")) return;
    setLoading(true);
    const { error } = await supabase.from("apps").delete().eq("id", id!);
    setLoading(false);
    if (error) toast.error(error.message);
    else {
      toast.success("App deleted");
      queryClient.invalidateQueries({ queryKey: ["admin-apps"] });
      queryClient.invalidateQueries({ queryKey: ["apps"] });
      navigate("/admin");
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card className="glass border-border/50">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="font-display gradient-neon-text">
              {isEdit ? "Edit App" : "Upload New App"}
            </CardTitle>
            {isEdit && (
              <Button variant="destructive" size="sm" onClick={handleDelete} disabled={loading}>
                <Trash2 className="h-4 w-4 mr-1" /> Delete
              </Button>
            )}
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label>App Name *</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Version</Label>
                  <Input value={version} onChange={(e) => setVersion(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Size</Label>
                  <Input value={size} onChange={(e) => setSize(e.target.value)} placeholder="Auto-detected" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>App Icon</Label>
                <Input type="file" accept="image/*" onChange={(e) => setIconFile(e.target.files?.[0] || null)} />
              </div>
              <div className="space-y-2">
                <Label>APK File</Label>
                <Input type="file" accept=".apk" onChange={(e) => setApkFile(e.target.files?.[0] || null)} />
                {apkFile && <p className="text-xs text-muted-foreground">{apkFile.name} ({(apkFile.size / (1024*1024)).toFixed(1)} MB)</p>}
              </div>
              <div className="space-y-2">
                <Label>Screenshots</Label>
                <Input type="file" accept="image/*" multiple onChange={(e) => setScreenshotFiles(Array.from(e.target.files || []))} />
              </div>
              <Button type="submit" className="w-full gradient-neon text-primary-foreground neon-glow" disabled={loading}>
                <Upload className="h-4 w-4 mr-2" />
                {loading ? "Processing..." : isEdit ? "Update App" : "Upload App"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default AppForm;
