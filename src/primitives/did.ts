import { AgentDidApi, AgentDidResolverCache, DwnDidStore } from '@web5/agent';
import { CryptoApi, JwkType, LocalKeyManager } from '@web5/crypto';
import {
  BearerDid,
  DidDht,
  DidDocument,
  DidJwk,
  DidJwkCreateOptions,
  DidVerificationMethod,
  DidWeb,
  PortableDid
} from '@web5/dids';
import { Web5UserAgent } from '@web5/user-agent';
import { Logger } from '../index.js';
import { DidUtils } from '../utils/did-utils.js';
import { Web5 } from '@web5/api';
// import { Web5 } from '@web5/api';
// import { DidUtils } from '../utils/did-utils.js';
export type DidParams = { gateway: string; out: string; };
export type DidCreateParams = DidParams & { endpoint: string; };
export type DidPublishParams = DidParams & { did: BearerDid; };
export type DidPublishPortableParams = DidParams & { did: string; };
export type DidResolveParams = DidParams & { did: string; };

const webPortable = await DidJwk.create();
class DidWebFacade extends DidWeb {
  public static async create<TKms extends CryptoApi | undefined = undefined>({ keyManager = new LocalKeyManager(), options = {} }: {
    keyManager?: TKms;
    options?: DidJwkCreateOptions<TKms>;
  } = {}): Promise<BearerDid> {
    throw new Error('Method not implemented.' + keyManager + options);
  }

  public static async getSigningMethod({ didDocument }: {
    didDocument: DidDocument;
    methodId?: string;
  }): Promise<DidVerificationMethod> {
    throw new Error('Method not implemented.' + didDocument);
  }
}

const webBearer = await BearerDid.import({ portableDid: webPortable });
const didApi = new AgentDidApi({
  didMethods    : [DidDht, DidJwk, DidWebFacade],
  resolverCache : new AgentDidResolverCache({ location: `DATA/WEB/DID_RESOLVERCACHE` }),
  store         : new DwnDidStore()
});
const agent = await Web5UserAgent.create({ agentDid: webBearer, dataPath: 'DATA/WEB/AGENT', didApi });
const { web5, did } = await Web5.connect({ agent, connectedDid: 'did:web:nonni.org' });

Logger.log('web5', web5);
Logger.log('did', did);

export class Did extends DidUtils {
  public static async importPortable({ portableDid }: { portableDid: PortableDid }) {
    return await DidDht.import({ portableDid });
  }

  public static async create({ endpoint, gateway, out }: DidCreateParams) {
    const bearerDid = await DidDht.create({options: { gatewayUri: gateway }});
    bearerDid.document.service = [
      {
        'id'              : bearerDid.uri,
        'type'            : 'DecentralizedWebNode',
        'serviceEndpoint' : [endpoint],
        'enc'             : '#enc',
        'sig'             : '#sig'
      }
    ];
    out = `${out}/${bearerDid.uri}`;
    await Did.publishBearer({ did: bearerDid, gateway, out });
    const portableDid = await bearerDid.export();
    await DidUtils.writeDid({out, portableDid});
    Logger.info(`[create] created did ${portableDid.uri} - saved public document to ${out}/did.json - saved private document to ${out}/portable-did.json`);
    return bearerDid;
  }

  public static async publish({ did, gateway, out }: DidPublishParams) {
    out = `${out}/${did.uri}`;
    const didRegistration = await DidDht.publish({ did, gatewayUri: gateway });
    await DidUtils.writePublish({out, didRegistration});
    const portableDid = await did.export();
    await DidUtils.writeDid({out, portableDid});
    return portableDid.uri;
  }

  public static async resolve({ did, gateway, out }: DidResolveParams) {
    out = `${out}/${did}`;
    const didResolution = await DidDht.resolve(did, { gatewayUri: gateway });
    await Did.writeResolution(out, didResolution);
    Logger.info(`[resolve] resolved did ${did} - saved to ${out}/did.json`);
    return did;
  }
}
