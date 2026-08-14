import './style.css';
import { bootstrap } from './app/bootstrap';

bootstrap().catch(error => {
  console.error('[v3-bootstrap]', error);
  const status = document.getElementById('status');
  if (status) status.textContent = `Initialization failed: ${error instanceof Error ? error.message : String(error)}`;
});
