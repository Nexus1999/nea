import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { jsPDF } from "https://esm.sh/jspdf@2.5.1"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { version1Id, version2Id, format = 'json' } = await req.json()

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    // Fetch the two versions
    const { data: versions, error: fetchError } = await supabaseClient
      .from('master_summary_versions')
      .select('*')
      .in('id', [version1Id, version2Id])

    if (fetchError || !versions || versions.length < 2) {
      throw new Error('Could not find both versions to compare')
    }

    const v1 = versions.find(v => v.id === version1Id)
    const v2 = versions.find(v => v.id === version2Id)

    // Simple diff logic (you can replace this with OpenAI or a more complex diffing library)
    const diffReport = {
      title: `Comparison: Version ${v1.version_number} vs Version ${v2.version_number}`,
      date: new Date().toLocaleDateString(),
      changes: [
        {
          section: "Content",
          oldValue: v1.content.substring(0, 100) + "...",
          newValue: v2.content.substring(0, 100) + "...",
          status: v1.content === v2.content ? "unchanged" : "modified"
        }
      ],
      summary: "This is a generated difference report between two versions of the master summary."
    }

    if (format === 'pdf') {
      const doc = new jsPDF()
      
      // Styling the PDF
      doc.setFontSize(20)
      doc.text("Difference Report", 20, 20)
      
      doc.setFontSize(12)
      doc.text(`Generated on: ${diffReport.date}`, 20, 30)
      doc.text(diffReport.title, 20, 40)
      
      doc.setFontSize(14)
      doc.text("Summary:", 20, 60)
      doc.setFontSize(10)
      const splitSummary = doc.splitTextToSize(diffReport.summary, 170)
      doc.text(splitSummary, 20, 70)

      doc.setFontSize(14)
      doc.text("Changes:", 20, 90)
      
      let yPos = 100
      diffReport.changes.forEach((change) => {
        doc.setFontSize(12)
        doc.text(`Section: ${change.section} (${change.status})`, 20, yPos)
        yPos += 10
        doc.setFontSize(10)
        doc.text("Old:", 20, yPos)
        doc.text(doc.splitTextToSize(change.oldValue, 150), 30, yPos)
        yPos += 20
        doc.text("New:", 20, yPos)
        doc.text(doc.splitTextToSize(change.newValue, 150), 30, yPos)
        yPos += 30
      })

      const pdfOutput = doc.output('arraybuffer')
      
      return new Response(pdfOutput, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="diff-report-${version1Id}-${version2Id}.pdf"`
        },
      })
    }

    // Default: Return JSON
    return new Response(JSON.stringify(diffReport), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})