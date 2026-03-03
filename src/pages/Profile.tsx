import React from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Mail, User } from "lucide-react";

const Profile: React.FC = () => {
  const { user, profile } = useAuth();

  const { data: downloads = [] } = useQuery({
    queryKey: ["my-downloads", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("downloads")
        .select("*, apps(name, icon_url)")
        .eq("user_id", user!.id)
        .order("downloaded_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card className="glass border-border/50">
          <CardHeader>
            <CardTitle className="font-display gradient-neon-text">My Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <User className="h-5 w-5 text-neon-pink" />
              <span>{profile?.display_name || "User"}</span>
            </div>
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-neon-blue" />
              <span>{user?.email}</span>
            </div>
          </CardContent>
        </Card>

        <h2 className="font-display text-xl font-bold mt-8 mb-4 text-foreground">Download History</h2>
        {downloads.length === 0 ? (
          <p className="text-muted-foreground">No downloads yet.</p>
        ) : (
          <div className="space-y-2">
            {downloads.map((d: any) => (
              <Card key={d.id} className="glass border-border/50">
                <CardContent className="flex items-center gap-3 p-4">
                  <Download className="h-4 w-4 text-neon-pink" />
                  <span className="flex-1">{d.apps?.name || "Unknown App"}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(d.downloaded_at).toLocaleDateString()}
                  </span>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Profile;
