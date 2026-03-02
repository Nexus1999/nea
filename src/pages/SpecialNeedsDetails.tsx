"use client";

import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { 
  Drawer, 
  DrawerContent, 
  DrawerHeader, 
  DrawerTitle, 
  DrawerTrigger,
  DrawerClose,
  DrawerFooter
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

const SpecialNeedsDetails = () => {
  const { id } = useParams();
  
  const { data: student, isLoading } = useQuery({
    queryKey: ['special-needs-student', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('special_needs_students')
        .select(`
          *,
          student_subjects (
            subject_id,
            subjects (
              name
            )
          )
        `)
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="w-full py-6 px-2 md:px-4">
        <Skeleton className="h-12 w-3/4 mb-6" />
        <div className="grid gap-6">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    );
  }

  if (!student) {
    return <div className="p-8 text-center">Student not found.</div>;
  }

  // Helper to format subjects correctly
  const subjectsList = student.student_subjects?.map((ss: any) => ss.subjects?.name).filter(Boolean) || [];

  return (
    <div className="w-full py-6 px-2 md:px-6 lg:px-8">
      <div className="flex flex-col gap-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold tracking-tight">{student.full_name}</h1>
          <Badge variant="outline" className="text-lg px-3 py-1">
            Grade {student.grade}
          </Badge>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Student Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Category</p>
                <p className="text-lg">{student.category || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Support Level</p>
                <Badge>{student.support_level || 'Standard'}</Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <Drawer>
                <DrawerTrigger asChild>
                  <Button className="w-full">View Full Summary</Button>
                </DrawerTrigger>
                <DrawerContent>
                  <div className="mx-auto w-full max-w-2xl">
                    <DrawerHeader>
                      <DrawerTitle>Summary for {student.full_name}</DrawerTitle>
                    </DrawerHeader>
                    <ScrollArea className="h-[60vh] p-6">
                      <div className="space-y-6">
                        <section>
                          <h4 className="font-semibold mb-2">Subjects</h4>
                          <div className="flex flex-wrap gap-2">
                            {subjectsList.length > 0 ? (
                              subjectsList.map((subject: string, index: number) => (
                                <Badge key={index} variant="secondary">{subject}</Badge>
                              ))
                            ) : (
                              <span className="text-muted-foreground italic">No subjects assigned</span>
                            )}
                          </div>
                        </section>
                        
                        <section>
                          <h4 className="font-semibold mb-2">Accommodations</h4>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {student.accommodations || "No specific accommodations listed."}
                          </p>
                        </section>

                        <section>
                          <h4 className="font-semibold mb-2">Teacher Notes</h4>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {student.notes || "No additional notes available."}
                          </p>
                        </section>
                      </div>
                    </ScrollArea>
                    <DrawerFooter>
                      <DrawerClose asChild>
                        <Button variant="outline">Close</Button>
                      </DrawerClose>
                    </DrawerFooter>
                  </div>
                </DrawerContent>
              </Drawer>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SpecialNeedsDetails;