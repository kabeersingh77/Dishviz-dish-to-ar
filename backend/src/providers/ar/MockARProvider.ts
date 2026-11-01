/**
 * MockARProvider
 *
 * Used for local sandbox testing, development, and demo verification.
 * Simulates realistic 3D reconstruction pipeline states and generates a valid
 * 3D glTF 2.0 GLB binary model and thumbnail without requiring third-party API keys.
 */
import type {
  ARGenerationProvider,
  ARAssets,
  ARJobStatus,
  JobMetadata,
  JobStateUpdate,
} from './ARGenerationProvider';

export class MockARProvider implements ARGenerationProvider {
  readonly providerId = 'mock';

  private jobs = new Map<string, { startTime: number; status: ARJobStatus }>();

  isConfigured(): boolean {
    return true;
  }

  async createJob(
    _images: Buffer[],
    _metadata: JobMetadata
  ): Promise<{ providerJobId: string }> {
    const providerJobId = `mock_job_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    this.jobs.set(providerJobId, {
      startTime: Date.now(),
      status: 'queued',
    });
    return { providerJobId };
  }

  async getJobStatus(providerJobId: string): Promise<JobStateUpdate> {
    const record = this.jobs.get(providerJobId);
    if (!record) {
      return { status: 'ready' };
    }

    const elapsedMs = Date.now() - record.startTime;

    if (elapsedMs < 1_500) {
      record.status = 'queued';
      return { status: 'queued', progressMessage: 'Analyzing captured views' };
    } else if (elapsedMs < 3_500) {
      record.status = 'reconstructing_object';
      return { status: 'reconstructing_object', progressMessage: 'Generating 3D geometry' };
    } else if (elapsedMs < 5_500) {
      record.status = 'generating_3d_model';
      return { status: 'generating_3d_model', progressMessage: 'Optimizing textures and mesh' };
    } else {
      record.status = 'ready';
      return { status: 'ready', progressMessage: '3D reconstruction complete' };
    }
  }

  async fetchAssets(_providerJobId: string): Promise<ARAssets> {
    return {
      glb: generateSampleGlb(),
      thumbnail: generateSampleThumbnail(),
    };
  }
}

function generateSampleThumbnail(): Buffer {
  return Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkWPjfDwAEfQHzR0+G4wAAAABJRU5ErkJggg==',
    'base64'
  );
}

function generateSampleGlb(): Buffer {
  const positions = new Float32Array([
    // Front face
    -0.5, -0.5,  0.5,   0.5, -0.5,  0.5,   0.5,  0.5,  0.5,  -0.5,  0.5,  0.5,
    // Back face
    -0.5, -0.5, -0.5,  -0.5,  0.5, -0.5,   0.5,  0.5, -0.5,   0.5, -0.5, -0.5,
    // Top face
    -0.5,  0.5, -0.5,  -0.5,  0.5,  0.5,   0.5,  0.5,  0.5,   0.5,  0.5, -0.5,
    // Bottom face
    -0.5, -0.5, -0.5,   0.5, -0.5, -0.5,   0.5, -0.5,  0.5,  -0.5, -0.5,  0.5,
    // Right face
     0.5, -0.5, -0.5,   0.5,  0.5, -0.5,   0.5,  0.5,  0.5,   0.5, -0.5,  0.5,
    // Left face
    -0.5, -0.5, -0.5,  -0.5, -0.5,  0.5,  -0.5,  0.5,  0.5,  -0.5,  0.5, -0.5,
  ]);
  const indices = new Uint16Array([
     0,  1,  2,   0,  2,  3,
     4,  5,  6,   4,  6,  7,
     8,  9, 10,   8, 10, 11,
    12, 13, 14,  12, 14, 15,
    16, 17, 18,  16, 18, 19,
    20, 21, 22,  20, 22, 23
  ]);

  const posBuf = Buffer.from(positions.buffer);
  const indBuf = Buffer.from(indices.buffer);
  const binBuf = Buffer.concat([posBuf, indBuf]);

  const gltf = {
    asset: { version: '2.0', generator: 'ObjectAR Sandbox' },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0, name: 'SampleObject' }],
    meshes: [{
      primitives: [{
        attributes: { POSITION: 0 },
        indices: 1,
        material: 0
      }]
    }],
    materials: [{
      pbrMetallicRoughness: {
        baseColorFactor: [0.1, 0.5, 0.9, 1.0],
        metallicFactor: 0.2,
        roughnessFactor: 0.4
      },
      name: 'SampleMaterial'
    }],
    accessors: [
      {
        bufferView: 0,
        byteOffset: 0,
        componentType: 5126, // FLOAT
        count: 24,
        type: 'VEC3',
        max: [0.5, 0.5, 0.5],
        min: [-0.5, -0.5, -0.5]
      },
      {
        bufferView: 1,
        byteOffset: 0,
        componentType: 5123, // UNSIGNED_SHORT
        count: 36,
        type: 'SCALAR',
        max: [23],
        min: [0]
      }
    ],
    bufferViews: [
      {
        buffer: 0,
        byteOffset: 0,
        byteLength: posBuf.length,
        target: 34962 // ARRAY_BUFFER
      },
      {
        buffer: 0,
        byteOffset: posBuf.length,
        byteLength: indBuf.length,
        target: 34963 // ELEMENT_ARRAY_BUFFER
      }
    ],
    buffers: [{ byteLength: binBuf.length }]
  };

  let jsonStr = JSON.stringify(gltf);
  while (Buffer.byteLength(jsonStr, 'utf8') % 4 !== 0) {
    jsonStr += ' ';
  }
  const jsonBuf = Buffer.from(jsonStr, 'utf8');

  const totalLength = 12 + 8 + jsonBuf.length + 8 + binBuf.length;
  const header = Buffer.alloc(12);
  header.writeUInt32LE(0x46546C67, 0); // 'glTF'
  header.writeUInt32LE(2, 4);          // version 2
  header.writeUInt32LE(totalLength, 8);

  const jsonHeader = Buffer.alloc(8);
  jsonHeader.writeUInt32LE(jsonBuf.length, 0);
  jsonHeader.writeUInt32LE(0x4E4F534A, 4); // 'JSON'

  const binHeader = Buffer.alloc(8);
  binHeader.writeUInt32LE(binBuf.length, 0);
  binHeader.writeUInt32LE(0x004E4942, 4);  // 'BIN\0'

  return Buffer.concat([header, jsonHeader, jsonBuf, binHeader, binBuf]);
}
