import { packager } from '@electron/packager';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { systemTar } from '../../src/platform.mjs';
import { appRoot } from '../../scripts/lib/target.mjs';
import { PACKAGER, stageApp } from '../../scripts/lib/stage.mjs';

// A portable directory, preserving executable permissions and symlinks.
export default async function packageLinux(target) {
  const { stage, version, pkg, out } = await stageApp(target);
  const [built] = await packager({
    ...PACKAGER, dir: stage, out,
    appVersion: version, electronVersion: pkg.devDependencies.electron,
    platform: 'linux', arch: target.arch, icon: path.join(appRoot, 'assets/mark.png'),
    extraResource: [target.seed],
  });
  const portable = path.join(out, `${target.artifact}-v${version}-Portable.tar.gz`);
  execFileSync(systemTar(), ['-czf', portable, '-C', path.dirname(built), path.basename(built)], { stdio: 'inherit' });
  return [built, portable];
}
