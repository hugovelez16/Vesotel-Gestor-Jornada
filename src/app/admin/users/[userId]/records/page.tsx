import RecordsClient from './RecordsClient';

// Esto genera la página estática falsa para el build
export async function generateStaticParams() {
  return [{ userId: 'demo' }];
}

// Renderizamos el cliente SIN pasarle props, para evitar errores de searchParams
export default function Page() {
  return <RecordsClient />;
}
