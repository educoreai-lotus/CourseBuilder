import { useCallback, useMemo } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useApp } from '../context/AppContext';

/**
 * Custom Node Component for Mind Map
 */
const MindMapNode = ({ data, selected }) => {
  const { theme } = useApp();
  const isDark = theme === 'night-mode';
  
  const bgColor = data.style?.backgroundColor || (isDark ? '#1e293b' : '#f1f5f9');
  const textColor = isDark ? '#f1f5f9' : '#1e293b';
  const borderColor = selected 
    ? (isDark ? '#0ea5e9' : '#0284c7')
    : (isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)');

  return (
    <div
      style={{
        background: bgColor,
        border: `2px solid ${borderColor}`,
        borderRadius: '12px',
        padding: '12px 16px',
        minWidth: '150px',
        maxWidth: '250px',
        boxShadow: selected 
          ? `0 4px 12px ${isDark ? 'rgba(14, 165, 233, 0.4)' : 'rgba(2, 132, 199, 0.3)'}`
          : '0 2px 8px rgba(0, 0, 0, 0.1)',
        transition: 'all 0.2s ease',
      }}
    >
      <div
        style={{
          fontWeight: '600',
          fontSize: '14px',
          color: textColor,
          marginBottom: data.description ? '6px' : '0',
        }}
      >
        {data.label || data.data?.label || 'Node'}
      </div>
      {data.description && (
        <div
          style={{
            fontSize: '12px',
            color: isDark ? '#94a3b8' : '#64748b',
            lineHeight: '1.4',
          }}
        >
          {data.description || data.data?.description}
        </div>
      )}
    </div>
  );
};

const nodeTypes = {
  concept: MindMapNode,
  default: MindMapNode,
};

/**
 * MindMap Component
 * Renders a mind map using React Flow
 * 
 * @param {Object} props
 * @param {Object} props.data - { nodes: [], edges: [] }
 * @param {string} props.className - CSS classes
 */
export const MindMap = ({ data, className = '' }) => {
  const { theme } = useApp();
  const isDark = theme === 'night-mode';

  // Normalize nodes - handle both formats
  const normalizedNodes = useMemo(() => {
    if (!data?.nodes || !Array.isArray(data.nodes)) return [];
    
    return data.nodes.map((node) => {
      // If node already has React Flow structure, use it
      if (node.data && typeof node.data === 'object' && !node.data.label && node.data.data) {
        // Nested data structure
        return {
          id: node.id,
          type: node.type || 'concept',
          data: {
            label: node.data.data.label || node.data.data.group || node.id,
            description: node.data.data.description || '',
            ...node.data.data,
          },
          position: node.position || { x: 0, y: 0 },
          style: node.style || {},
        };
      }
      
      // If node has data.label directly
      if (node.data?.label) {
        return {
          id: node.id,
          type: node.type || 'concept',
          data: {
            label: node.data.label,
            description: node.data.description || node.data.data?.description || '',
            ...node.data,
          },
          position: node.position || { x: 0, y: 0 },
          style: node.style || {},
        };
      }
      
      // Legacy format - node has label directly
      return {
        id: node.id,
        type: node.type || 'concept',
        data: {
          label: node.label || node.data?.group || node.id,
          description: node.description || node.data?.description || '',
        },
        position: node.position || { x: 0, y: 0 },
        style: node.style || {},
      };
    });
  }, [data?.nodes]);

  // Normalize edges
  const normalizedEdges = useMemo(() => {
    if (!data?.edges || !Array.isArray(data.edges)) return [];
    
    return data.edges.map((edge) => ({
      id: edge.id || `edge-${edge.source}-${edge.target}`,
      source: edge.source,
      target: edge.target,
      type: edge.type || 'smoothstep',
      label: edge.label || '',
      animated: edge.animated !== false,
      style: {
        stroke: isDark ? '#60a5fa' : '#3b82f6',
        strokeWidth: 2,
        ...edge.style,
      },
      labelStyle: {
        fill: isDark ? '#f1f5f9' : '#1e293b',
        fontWeight: 500,
        fontSize: '11px',
      },
      labelBgStyle: {
        fill: isDark ? '#1e293b' : '#f8fafc',
        fillOpacity: 0.8,
      },
    }));
  }, [data?.edges, isDark]);

  const [nodes, setNodes, onNodesChange] = useNodesState(normalizedNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(normalizedEdges);

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  // Update nodes/edges when data changes
  useMemo(() => {
    if (normalizedNodes.length > 0) {
      setNodes(normalizedNodes);
    }
  }, [normalizedNodes, setNodes]);

  useMemo(() => {
    if (normalizedEdges.length > 0) {
      setEdges(normalizedEdges);
    }
  }, [normalizedEdges, setEdges]);

  if (!data || !data.nodes || data.nodes.length === 0) {
    return (
      <div className={`w-full h-96 border-2 border-dashed rounded-lg flex items-center justify-center ${className}`}
        style={{
          borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
        }}
      >
        <p style={{ color: isDark ? '#94a3b8' : '#64748b' }}>No mind map data available</p>
      </div>
    );
  }

  return (
    <div className={`w-full ${className}`} style={{ height: '600px', minHeight: '400px' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        style={{
          background: isDark ? '#0f172a' : '#ffffff',
        }}
      >
        <Background 
          color={isDark ? '#1e293b' : '#e2e8f0'} 
          gap={16}
          size={1}
        />
        <Controls 
          style={{
            button: {
              backgroundColor: isDark ? '#1e293b' : '#ffffff',
              color: isDark ? '#f1f5f9' : '#1e293b',
              border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)'}`,
            },
          }}
        />
        <MiniMap
          style={{
            backgroundColor: isDark ? '#1e293b' : '#f8fafc',
          }}
          nodeColor={(node) => {
            return isDark ? '#3b82f6' : '#60a5fa';
          }}
          maskColor={isDark ? 'rgba(15, 23, 42, 0.6)' : 'rgba(255, 255, 255, 0.6)'}
        />
      </ReactFlow>
    </div>
  );
};
