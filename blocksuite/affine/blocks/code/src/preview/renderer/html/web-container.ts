import type { CodeBlockModel } from '@blocksuite/affine-model';
import { WebContainer } from '@webcontainer/api';

let sharedWebContainer: WebContainer | null = null;
let bootPromise: Promise<WebContainer> | null = null;

const getSharedWebContainer = async (): Promise<WebContainer> => {
  if (sharedWebContainer) {
    return sharedWebContainer;
  }

  if (bootPromise) {
    return bootPromise;
  }

  bootPromise = WebContainer.boot();

  try {
    sharedWebContainer = await bootPromise;
    return sharedWebContainer;
  } catch (e) {
    throw new Error('Failed to boot WebContainer: ' + e);
  }
};

let serveUrl: string | null = null;
let settingServerUrlPromise: Promise<string> | null = null;
const getServeUrl = async (): Promise<string> => {
  if (serveUrl) {
    return serveUrl;
  }

  if (settingServerUrlPromise) {
    return settingServerUrlPromise;
  }

  const { promise, resolve, reject } = Promise.withResolvers<string>();
  settingServerUrlPromise = promise;

  try {
    const webContainer = await getSharedWebContainer();
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
      resolve(url);
    });

    const installProcess = await webContainer.spawn('npm', ['install']);
    await installProcess.exit;

    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    webContainer.spawn('npx', ['serve']);
  } catch (e) {
    reject(e);
  }

  return promise;
};

export async function linkWebContainer(
  iframe: HTMLIFrameElement,
  model: CodeBlockModel
) {
  const html = model.props.text.toString();
  const id = model.id;

  const webContainer = await getSharedWebContainer();
  const serveUrl = await getServeUrl();

  await webContainer.fs.writeFile(`${id}.html`, html);
  iframe.src = `${serveUrl}/${id}.html`;
}
