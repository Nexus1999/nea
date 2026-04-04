"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  User, Mail, Shield, Calendar, 
  Edit, Save, Loader2, Camera, Lock
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import Spinner from "@/components/Spinner";
import ChangePasswordModal from "@/components/security/ChangePasswordModal";

const Profile = () => {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    username: '',
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from('profiles')
        .select('*, roles(name)')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      setProfile(data);
      setFormData({
        first_name: data.first_name || '',
        last_name: data.last_name || '',
        username: data.username || '',
      });
    } catch (err: any) {
      showError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: formData.first_name,
          last_name: formData.last_name,
          username: formData.username,
          updated_at: new Date().toISOString(),
        })
        .eq('id', profile.id);

      if (error) throw error;
      showSuccess("Profile updated successfully");
      setIsEditing(false);
      fetchProfile();
    } catch (err: any) {
      showError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="py-20 flex justify-center"><Spinner /></div>;

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">My Profile</h2>
          <p className="text-muted-foreground mt-1">Manage your personal information and account settings.</p>
        </div>
        <Button 
          variant={isEditing ? "outline" : "default"} 
          onClick={() => isEditing ? setIsEditing(false) : setIsEditing(true)}
          className={isEditing ? "" : "bg-black hover:bg-gray-800"}
        >
          {isEditing ? "Cancel" : <><Edit className="h-4 w-4 mr-2" /> Edit Profile</>}
        </Button>
      </div>

      <div className="grid gap-8 md:grid-cols-3">
        <Card className="md:col-span-1 border-none shadow-sm">
          <CardContent className="pt-8 flex flex-col items-center text-center">
            <div className="relative group">
              <div className="h-32 w-32 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-4xl font-bold shadow-lg">
                {profile.username?.charAt(0).toUpperCase()}
              </div>
              <button className="absolute bottom-0 right-0 p-2 bg-white rounded-full shadow-md border border-slate-100 text-slate-600 hover:text-indigo-600 transition-colors">
                <Camera className="h-4 w-4" />
              </button>
            </div>
            <h3 className="mt-4 text-xl font-bold text-gray-900">{profile.first_name} {profile.last_name}</h3>
            <p className="text-sm text-gray-500">@{profile.username}</p>
            
            <div className="mt-6 w-full space-y-3 pt-6 border-t border-slate-50">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500 font-medium flex items-center gap-1">
                  <Shield className="h-3 w-3" /> Role
                </span>
                <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 border-none font-bold">
                  {profile.roles?.name}
                </Badge>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500 font-medium flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> Joined
                </span>
                <span className="font-bold text-gray-900">
                  {new Date(profile.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>

            <Button 
              variant="outline" 
              className="w-full mt-8 rounded-xl border-slate-200 gap-2"
              onClick={() => setIsPasswordModalOpen(true)}
            >
              <Lock className="h-4 w-4" />
              Change Password
            </Button>
          </CardContent>
        </Card>

        <Card className="md:col-span-2 border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-bold">Personal Information</CardTitle>
            <CardDescription>Update your name and contact details.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase">First Name</Label>
                <Input 
                  disabled={!isEditing}
                  value={formData.first_name}
                  onChange={(e) => setFormData({...formData, first_name: e.target.value})}
                  className="rounded-xl border-slate-200"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase">Last Name</Label>
                <Input 
                  disabled={!isEditing}
                  value={formData.last_name}
                  onChange={(e) => setFormData({...formData, last_name: e.target.value})}
                  className="rounded-xl border-slate-200"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase">Username</Label>
              <Input 
                disabled={!isEditing}
                value={formData.username}
                onChange={(e) => setFormData({...formData, username: e.target.value})}
                className="rounded-xl border-slate-200"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input 
                  disabled
                  value={profile.email}
                  className="pl-10 rounded-xl border-slate-200 bg-slate-50"
                />
              </div>
              <p className="text-[10px] text-slate-400 italic">Email cannot be changed directly for security reasons.</p>
            </div>

            {isEditing && (
              <div className="pt-4 flex justify-end">
                <Button 
                  onClick={handleSave} 
                  disabled={saving}
                  className="bg-black hover:bg-gray-800 rounded-xl px-8"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="h-4 w-4 mr-2" /> Save Changes</>}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <ChangePasswordModal 
        open={isPasswordModalOpen} 
        onOpenChange={setIsPasswordModalOpen} 
        user={profile} 
      />
    </div>
  );
};

export default Profile;