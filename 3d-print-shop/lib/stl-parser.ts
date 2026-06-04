/**
 * Simple STL parser to extract vertex data and calculate weight
 * STL files are triangular mesh representations of 3D objects
 */

export interface STLData {
  vertices: number[][];
  triangles: number[][];
  volume: number;
  estimatedWeight: number;
}

const FILAMENT_DENSITY = 1.24; // g/cm³ for standard PLA

export async function parseSTLFile(buffer: Buffer): Promise<STLData> {
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.length);
  
  // Check if it's binary STL (first 80 bytes are header, then 4 bytes for triangle count)
  const isBinary = buffer.length > 84;
  
  if (isBinary) {
    return parseBinarySTL(view);
  } else {
    return parseASCIISTL(buffer);
  }
}

function parseBinarySTL(view: DataView): STLData {
  // Skip 80-byte header
  const triangleCount = view.getUint32(80, true);
  
  const vertices: number[][] = [];
  const triangles: number[][] = [];
  const vertexMap = new Map<string, number>();
  
  let offset = 84; // Start after header and triangle count
  
  for (let i = 0; i < triangleCount; i++) {
    // Skip normal vector (3 floats = 12 bytes)
    offset += 12;
    
    const triangle = [];
    
    // Read 3 vertices (each is 3 floats = 12 bytes)
    for (let j = 0; j < 3; j++) {
      const x = view.getFloat32(offset, true);
      const y = view.getFloat32(offset + 4, true);
      const z = view.getFloat32(offset + 8, true);
      offset += 12;
      
      const key = `${x},${y},${z}`;
      
      if (!vertexMap.has(key)) {
        vertexMap.set(key, vertices.length);
        vertices.push([x, y, z]);
      }
      
      triangle.push(vertexMap.get(key)!);
    }
    
    triangles.push(triangle);
    
    // Skip attribute byte count (2 bytes)
    offset += 2;
  }
  
  const volume = calculateVolume(vertices, triangles);
  const estimatedWeight = estimateWeight(volume);
  
  return {
    vertices,
    triangles,
    volume,
    estimatedWeight,
  };
}

function parseASCIISTL(buffer: Buffer): STLData {
  const content = buffer.toString('utf-8');
  const vertices: number[][] = [];
  const triangles: number[][] = [];
  const vertexMap = new Map<string, number>();
  
  // Match all "vertex x y z" lines
  const vertexRegex = /vertex\s+([-+]?[0-9]*\.?[0-9]+([eE][-+]?[0-9]+)?)\s+([-+]?[0-9]*\.?[0-9]+([eE][-+]?[0-9]+)?)\s+([-+]?[0-9]*\.?[0-9]+([eE][-+]?[0-9]+)?)/g;
  
  let match;
  let triangleVertices: number[] = [];
  
  while ((match = vertexRegex.exec(content)) !== null) {
    const x = parseFloat(match[1]);
    const y = parseFloat(match[3]);
    const z = parseFloat(match[5]);
    
    const key = `${x},${y},${z}`;
    
    if (!vertexMap.has(key)) {
      vertexMap.set(key, vertices.length);
      vertices.push([x, y, z]);
    }
    
    triangleVertices.push(vertexMap.get(key)!);
    
    if (triangleVertices.length === 3) {
      triangles.push([...triangleVertices]);
      triangleVertices = [];
    }
  }
  
  const volume = calculateVolume(vertices, triangles);
  const estimatedWeight = estimateWeight(volume);
  
  return {
    vertices,
    triangles,
    volume,
    estimatedWeight,
  };
}

function calculateVolume(vertices: number[][], triangles: number[][]): number {
  let volume = 0;
  
  for (const triangle of triangles) {
    const [i0, i1, i2] = triangle;
    const v0 = vertices[i0];
    const v1 = vertices[i1];
    const v2 = vertices[i2];
    
    // Calculate signed volume contribution using scalar triple product
    const v1x = v1[0] - v0[0];
    const v1y = v1[1] - v0[1];
    const v1z = v1[2] - v0[2];
    
    const v2x = v2[0] - v0[0];
    const v2y = v2[1] - v0[1];
    const v2z = v2[2] - v0[2];
    
    // Cross product v1 × v2
    const cx = v1y * v2z - v1z * v2y;
    const cy = v1z * v2x - v1x * v2z;
    const cz = v1x * v2y - v1y * v2x;
    
    // Dot product with v0
    const signedVolume = (v0[0] * cx + v0[1] * cy + v0[2] * cz) / 6;
    volume += signedVolume;
  }
  
  return Math.abs(volume);
}

function estimateWeight(volumeMM3: number): number {
  // Convert mm³ to cm³
  const volumeCM3 = volumeMM3 / 1000;
  // Calculate weight in grams
  const weight = volumeCM3 * FILAMENT_DENSITY;
  return Math.max(Math.round(weight * 10) / 10, 0.1); // Round to 0.1g, minimum 0.1g
}

export function calculateCost(weightGrams: number, pricePerGram: number = 30000): number {
  return Math.ceil(weightGrams * pricePerGram);
}
