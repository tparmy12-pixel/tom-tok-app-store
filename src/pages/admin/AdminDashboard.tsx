import React from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Users, Package, Plus, BarChart3, Sparkles } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

const AdminDashboard: React.FC = () => {
  const { data: apps = [] } = useQuery({
    queryKey: ["admin-apps"],
    queryFn: async () => {
      const { data, error } = await supabase.from("apps").select("*").order("download_count", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: totalDownloads = 0 } = useQuery({
    queryKey: ["admin-total-downloads"],
    queryFn: async () => {
      const { count, error } = await supabase.from("downloads").select("*", { count: "exact", head: true });
      if (error) throw error;
      return count || 0;
    },
  });

  const { data: totalUsers = 0 } = useQuery({
    queryKey: ["admin-total-users"],
    queryFn: async () => {
      const { count, error } = await supabase.from("profiles").select("*", { count: "exact", head: true });
      if (error) throw error;
      return count || 0;
    },
  });

  const chartData = apps.slice(0, 10).map((app) => ({
    name: app.name.length > 12 ? app.name.slice(0, 12) + "…" : app.name,
    downloads: app.download_count,
  }));

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="font-display text-3xl font-black gradient-neon-text">Admin Dashboard</h1>
          <div className="flex gap-2">
            <Link to="/admin/promotions">
              <Button variant="outline" className="border-neon-purple text-neon-purple hover:bg-neon-purple/10">
                <Sparkles className="h-4 w-4 mr-2" /> Promotions
              </Button>
            </Link>
            <Link to="/admin/apps/new">
              <Button className="gradient-neon text-primary-foreground neon-glow">
                <Plus className="h-4 w-4 mr-2" /> Upload App
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <Card className="glass border-border/50">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-neon-pink/20 flex items-center justify-center">
                <Download className="h-6 w-6 text-neon-pink" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{totalDownloads}</p>
                <p className="text-sm text-muted-foreground">Total Downloads</p>
              </div>
            </CardContent>
          </Card>
          <Card className="glass border-border/50">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-neon-blue/20 flex items-center justify-center">
                <Users className="h-6 w-6 text-neon-blue" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{totalUsers}</p>
                <p className="text-sm text-muted-foreground">Registered Users</p>
              </div>
            </CardContent>
          </Card>
          <Card className="glass border-border/50">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-neon-purple/20 flex items-center justify-center">
                <Package className="h-6 w-6 text-neon-purple" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{apps.length}</p>
                <p className="text-sm text-muted-foreground">Total Apps</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Chart */}
        {chartData.length > 0 && (
          <Card className="glass border-border/50 mb-8">
            <CardHeader>
              <CardTitle className="font-display flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-neon-pink" /> Downloads by App
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(230 20% 18%)" />
                  <XAxis dataKey="name" tick={{ fill: "hsl(215 20% 55%)", fontSize: 12 }} />
                  <YAxis tick={{ fill: "hsl(215 20% 55%)", fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(230 25% 10%)",
                      border: "1px solid hsl(230 20% 18%)",
                      borderRadius: "8px",
                      color: "hsl(210 40% 96%)",
                    }}
                  />
                  <Bar dataKey="downloads" fill="hsl(338 100% 59%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* App List */}
        <h2 className="font-display text-xl font-bold mb-4">Manage Apps</h2>
        {apps.length === 0 ? (
          <p className="text-muted-foreground">No apps yet. Upload your first app!</p>
        ) : (
          <div className="space-y-3">
            {apps.map((app) => (
              <Card key={app.id} className="glass border-border/50">
                <CardContent className="p-4 flex items-center gap-4">
                  {app.icon_url ? (
                    <img src={app.icon_url} alt={app.name} className="w-12 h-12 rounded-xl object-cover" />
                  ) : (
                    <div className="w-12 h-12 rounded-xl gradient-neon flex items-center justify-center">
                      <span className="font-display text-sm font-bold text-primary-foreground">{app.name.charAt(0)}</span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{app.name}</p>
                    <p className="text-sm text-muted-foreground">{app.category} · v{app.version} · {app.download_count} downloads</p>
                  </div>
                  <Link to={`/admin/apps/${app.id}/edit`}>
                    <Button variant="outline" size="sm">Edit</Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default AdminDashboard;
