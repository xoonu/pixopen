import { VestaNoteStudio } from './VestaNoteStudio';

export function VestaNoteEditor(props: Parameters<typeof VestaNoteStudio>[0]) {
  return <VestaNoteStudio {...props} />;
}
