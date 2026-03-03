"use client";

import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SubjectsTab from "@/components/settings/SubjectsTab";

const Settings = () => {
  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">Settings</h1>
      <Tabs defaultValue="subjects" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="subjects">Subjects</TabsTrigger>
          {/* Add other tabs here as needed */}
        </TabsList>
        <TabsContent value="subjects">
          <SubjectsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;