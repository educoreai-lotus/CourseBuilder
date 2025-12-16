import { MindMap } from './MindMap';
import { useApp } from '../context/AppContext';

/**
 * MindMapViewer Component
 * Wrapper component that displays mind map data using React Flow
 * 
 * @param {Object} props
 * @param {Object} props.data - Mind map data from backend with nodes and edges
 * 
 * Expected data structure:
 * {
 *   nodes: [
 *     {
 *       id: "C1",
 *       type: "concept",
 *       data: {
 *         label: "Main Topic",
 *         description: "Definition",
 *         category: "core",
 *         skills: ["skill1", "skill2"]
 *       },
 *       position: { x: 0, y: 0 },
 *       style: {
 *         backgroundColor: "#E3F2FD"
 *       }
 *     }
 *   ],
 *   edges: [
 *     {
 *       id: "E1",
 *       source: "C1",
 *       target: "C2",
 *       type: "smoothstep",
 *       label: "explains",
 *       animated: true
 *     }
 *   ]
 * }
 */
export const MindMapViewer = ({ data }) => {
  const { theme } = useApp();

  // Debug: Log received data
  console.log('[MindMapViewer] Received data:', { 
    data, 
    hasData: !!data, 
    hasNodes: !!data?.nodes, 
    nodesCount: data?.nodes?.length,
    hasEdges: !!data?.edges,
    edgesCount: data?.edges?.length 
  });

  // Handle missing or invalid data
  if (!data) {
    return (
      <div
        className="w-full rounded-lg border-2 p-8 text-center"
        style={{
          backgroundColor: theme === 'night-mode' ? '#1e293b' : '#f8fafc',
          borderColor: theme === 'night-mode' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
          minHeight: '400px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <p
          style={{
            color: theme === 'night-mode' ? '#94a3b8' : '#64748b',
          }}
        >
          No mind map data available
        </p>
      </div>
    );
  }

  // Ensure data has nodes array
  if (!data.nodes || !Array.isArray(data.nodes) || data.nodes.length === 0) {
    return (
      <div
        className="w-full rounded-lg border-2 p-8 text-center"
        style={{
          backgroundColor: theme === 'night-mode' ? '#1e293b' : '#f8fafc',
          borderColor: theme === 'night-mode' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
          minHeight: '400px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <p
          style={{
            color: theme === 'night-mode' ? '#94a3b8' : '#64748b',
          }}
        >
          Mind map data is empty or invalid
        </p>
      </div>
    );
  }

  // Normalize data structure to handle different backend formats
  const normalizedData = {
    nodes: (data.nodes || []).map((node) => {
      // Handle nested data structure from backend (node.data.data.label)
      if (node.data && node.data.data) {
        // Backend format: { id, data: { data: { label, description, ... } }, type, position, style }
        return {
          id: node.id,
          type: node.type || 'concept',
          data: {
            label: node.data.data.label || node.data.data.group || node.id,
            description: node.data.data.description || '',
            category: node.data.data.group || 'default',
            ...node.data.data,
          },
          position: node.position || { x: 0, y: 0 },
          style: node.style || {},
        };
      }
      
      // Handle different node formats from backend
      if (node.data && typeof node.data === 'object' && node.data.label) {
        // Already in expected format with data.label
        return {
          id: node.id,
          type: node.type || 'concept',
          data: {
            label: node.data.label,
            description: node.data.description || '',
            category: node.data.category || node.data.group || 'default',
            ...node.data,
          },
          position: node.position || { x: 0, y: 0 },
          style: node.style || {},
        };
      }
      
      // Handle legacy format: node has label, description, etc. directly
      return {
        id: node.id,
        type: node.type || 'concept',
        data: {
          label: node.label || node.id,
          description: node.description || '',
          category: node.category || 'default',
          skills: node.skills || [],
        },
        position: node.position || { x: 0, y: 0 },
        style: node.style || {},
      };
    }),
    edges: (data.edges || []).map((edge) => ({
      id: edge.id || `edge-${edge.source}-${edge.target}`,
      source: edge.source,
      target: edge.target,
      type: edge.type || 'smoothstep',
      label: edge.label || '',
      animated: edge.animated !== false,
      style: edge.style || {},
    })),
  };

  return (
    <div className="w-full">
      <MindMap data={normalizedData} className="rounded-lg" />
    </div>
  );
};
