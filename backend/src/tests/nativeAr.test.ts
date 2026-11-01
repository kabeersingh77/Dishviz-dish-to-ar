import { NativeARProvider } from '../providers/ar/NativeARProvider';

describe('NativeARProvider (Isolated 3D Engine)', () => {
  let provider: NativeARProvider;
  let sampleImage: Buffer;

  beforeAll(() => {
    provider = new NativeARProvider();

    // 1x1 valid sample PNG buffer
    sampleImage = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      'base64'
    );
  });

  it('reports providerId as "native" and isConfigured as true', () => {
    expect(provider.providerId).toBe('native');
    expect(provider.isConfigured()).toBe(true);
  });

  it('throws an error if no images are provided', async () => {
    await expect(
      provider.createJob([], { jobId: 'test-job', segmentationMode: 'smart', imageCount: 0 })
    ).rejects.toThrow('At least one input photo is required');
  });

  it('creates a job and tracks reconstruction status through to completion', async () => {
    const { providerJobId } = await provider.createJob(
      [sampleImage, sampleImage],
      { jobId: 'test-job-1', segmentationMode: 'smart', imageCount: 2 }
    );

    expect(providerJobId).toBeDefined();
    expect(providerJobId.startsWith('native_')).toBe(true);

    // Initial status should be active
    const initialStatus = await provider.getJobStatus(providerJobId);
    expect(initialStatus.status).toBeDefined();

    // Fetch assets returns glb buffer
    const assets = await provider.fetchAssets(providerJobId);
    expect(assets.glb).toBeDefined();
    expect(assets.glb!.length).toBeGreaterThan(100);

    // GLB magic number verification (glTF 2.0 = 0x46546C67 in little-endian)
    const magic = assets.glb!.readUInt32LE(0);
    expect(magic).toBe(0x46546C67);
  });
});
