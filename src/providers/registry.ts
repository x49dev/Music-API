import type { MusicProvider, ProviderId, ProviderCapability } from './types/index.js';
import { NotFoundError, BadRequestError } from '../errors/index.js';

export class ProviderRegistry {
  private providers: Map<ProviderId, MusicProvider> = new Map();
  private capabilityIndex: Map<ProviderCapability, Set<ProviderId>> = new Map();

  register(provider: MusicProvider): void {
    if (this.providers.has(provider.id)) {
      throw new BadRequestError(`Provider '${provider.id}' is already registered`);
    }

    this.providers.set(provider.id, provider);

    for (const capability of provider.capabilities) {
      if (!this.capabilityIndex.has(capability)) {
        this.capabilityIndex.set(capability, new Set());
      }
      this.capabilityIndex.get(capability)!.add(provider.id);
    }
  }

  unregister(providerId: ProviderId): boolean {
    const provider = this.providers.get(providerId);
    if (!provider) {
      return false;
    }

    for (const capability of provider.capabilities) {
      const providers = this.capabilityIndex.get(capability);
      if (providers) {
        providers.delete(providerId);
        if (providers.size === 0) {
          this.capabilityIndex.delete(capability);
        }
      }
    }

    return this.providers.delete(providerId);
  }

  get(providerId: ProviderId): MusicProvider {
    const provider = this.providers.get(providerId);
    if (!provider) {
      throw new NotFoundError(`Provider '${providerId}' not found`);
    }
    return provider;
  }

  getByCapability(capability: ProviderCapability): MusicProvider[] {
    const providerIds = this.capabilityIndex.get(capability);
    if (!providerIds) {
      return [];
    }

    return Array.from(providerIds)
      .map((id) => this.providers.get(id)!)
      .filter(Boolean);
  }

  has(providerId: ProviderId): boolean {
    return this.providers.has(providerId);
  }

  hasCapability(providerId: ProviderId, capability: ProviderCapability): boolean {
    const provider = this.providers.get(providerId);
    return provider?.capabilities.includes(capability) ?? false;
  }

  list(): MusicProvider[] {
    return Array.from(this.providers.values());
  }

  listIds(): ProviderId[] {
    return Array.from(this.providers.keys());
  }

  count(): number {
    return this.providers.size;
  }

  async healthCheckAll(): Promise<Map<ProviderId, boolean>> {
    const results = new Map<ProviderId, boolean>();

    const checks = Array.from(this.providers.entries()).map(async ([id, provider]) => {
      try {
        const isHealthy = await provider.healthCheck();
        results.set(id, isHealthy);
      } catch {
        results.set(id, false);
      }
    });

    await Promise.all(checks);
    return results;
  }

  clear(): void {
    this.providers.clear();
    this.capabilityIndex.clear();
  }
}

export const providerRegistry = new ProviderRegistry();
