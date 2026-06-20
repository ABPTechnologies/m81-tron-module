import { AirGapModule } from '@airgap/module-kit'
import { TronModule } from './v1/module'

/** AirGap isolated-module entrypoint. `manifest.json.src.namespace` resolves to this. */
export function create(): AirGapModule {
  return new TronModule()
}

export { TronModule }
