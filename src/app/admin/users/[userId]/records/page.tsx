import RecordsClient from './RecordsClient';

// 1. Esta es la función que necesita Plesk para no fallar
export async function generateStaticParams() {
  return [{ userId: 'demo' }];
}

// 2. Este componente renderiza tu lógica original
export default function Page(props: any) {
  return <RecordsClient {...props} />;
}
