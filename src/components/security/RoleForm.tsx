"use client";

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, Shield, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { showSuccess, showError } from "@/utils/toast";
import { logDataChange } from "@/utils/auditLogger";

const roleSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, "Role name is required"),
  description: z.string().optional(),
});

type RoleFormValues = z.infer<typeof roleSchema>;

interface RoleFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role?: RoleFormValues;
  onSuccess: () => void;
}

const RoleForm: React.FC<RoleFormProps> = ({ open, onOpenChange, role, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const isEditing = !!role?.id;

  const form = useForm<RoleFormValues>({
    resolver: zodResolver(roleSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  useEffect(() => {
    if (open) {
      if (role) {
        form.reset(role);
      } else {
        form.reset({ name: "", description: "" });
      }
    }
  }, [open, role, form]);

  const onSubmit = async (values: RoleFormValues) => {
    setLoading(true);
    try {
      if (isEditing) {
        const { error } = await supabase
          .from("roles")
          .update({
            name: values.name.toUpperCase(),
            description: values.description,
          })
          .eq("id", role.id);
        if (error) throw error;

        await logDataChange({
          table_name: 'roles',
          record_id: role.id!,
          action_type: 'UPDATE',
          old_data: role,
          new_data: values
        });

        showSuccess("Role updated successfully");
      } else {
        const { data, error } = await supabase.from("roles").insert({
          name: values.name.toUpperCase(),
          description: values.description,
        }).select('id').single();
        
        if (error) throw error;

        await logDataChange({
          table_name: 'roles',
          record_id: data.id,
          action_type: 'INSERT',
          new_data: values
        });

        showSuccess("Role created successfully");
      }
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      showError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            {isEditing ? "Edit Role" : "Create New Role"}
          </DialogTitle>
          <DialogDescription>
            Define system access levels and permissions.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-bold uppercase">Role Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. ADMINISTRATOR" className="uppercase" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-bold uppercase">Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Describe what this role can do..." 
                      className="resize-none" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="pt-4">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading} className="bg-black hover:bg-gray-800">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="mr-2 h-4 w-4" /> {isEditing ? "Update Role" : "Create Role"}</>}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default RoleForm;