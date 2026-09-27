import { AutomationEditorPage } from "@/components/automations/automation-editor-page"

export default async function AutomationEditorRoute({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <AutomationEditorPage id={id} />
}
