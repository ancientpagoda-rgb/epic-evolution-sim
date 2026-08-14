import './style.css';
import './mobile.css';
import { bootstrap } from './app/bootstrap';
import { installMobileHudController } from './ui/MobileHudController';

installMobileHudController();

bootstrap().catch(error => {
  console.error('[v3-bootstrap]', error);
  const status = document.getElementById('status');
  if (status) status.textContent = `Initialization failed: ${error instanceof Error ? error.message : String(error)}`;
});
