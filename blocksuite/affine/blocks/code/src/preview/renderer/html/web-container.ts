import type { CodeBlockModel } from '@blocksuite/affine-model';
import { WebContainer } from '@webcontainer/api';

let sharedWebContainer: WebContainer | null = null;
let isBooting = false;
let bootPromise: Promise<WebContainer> | null = null;

const getSharedWebContainer = async (): Promise<WebContainer> => {
  if (sharedWebContainer) {
    return sharedWebContainer;
  }

  if (isBooting) {
    return bootPromise as Promise<WebContainer>;
  }

  isBooting = true;
  bootPromise = WebContainer.boot();

  try {
    sharedWebContainer = await bootPromise;
    return sharedWebContainer;
  } finally {
    isBooting = false;
    bootPromise = null;
  }
};

let serveUrl: string | null = null;
export async function linkWebContainer(
  iframe: HTMLIFrameElement,
  model: CodeBlockModel
) {
  const html = model.props.text.toString();
  const id = model.id;

  const webContainer = await getSharedWebContainer();

  if (serveUrl) {
    await webContainer.fs.writeFile(`${id}.html`, html);

    iframe.src = `${serveUrl}/${id}.html`;

    return;
  }

  await webContainer.fs.writeFile(`${id}.html`, html);
  await webContainer.fs.writeFile(
    'package.json',
    `{
    "name":"preview",
    "devDependencies":{"serve":"^14.0.0"}
    }`
  );

  const dispose = webContainer.on('server-ready', (_, url) => {
    dispose();
    serveUrl = url;
    iframe.src = `${serveUrl}/${id}.html`;
  });

  const installProcess = await webContainer.spawn('npm', ['install']);
  await installProcess.exit;

  // throw error to html renderer
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  webContainer.spawn('npx', ['serve']);
}
