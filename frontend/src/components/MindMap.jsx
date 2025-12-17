import { useCallback, useMemo, useState } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Handle,
  Position,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useApp } from '../context/AppContext';

// Color mappings according to spec
const NODE_CATEGORY_COLORS_DAY = {
  core: '#E3F2FD',
  primary: '#FFF3E0',
  secondary: '#E8F5E9',
  related: '#F3E5F5',
  advanced: '#FCE4EC',
  default: '#F5F5F5',
};

const NODE_CATEGORY_COLORS_NIGHT = {
  core: '#1e3a5f',
  primary: '#4a3a1a',
  secondary: '#1a4a1a',
  related: '#4a1a4a',
  advanced: '#4a1a2a',
  default: '#334155',
};

/**
 * Custom Concept Node Component matching exact spec
 */
const ConceptNode = ({ data, selected }) => {
  const { theme } = useApp();
  const isDark = theme === 'night-mode' || theme === 'dark';
  const [showTooltip, setShowTooltip] = useState(false);

  // Get category color
  const category = data.category || 'default';
  const categoryColors = isDark ? NODE_CATEGORY_COLORS_NIGHT : NODE_CATEGORY_COLORS_DAY;
  const bgColor = data.style?.backgroundColor || categoryColors[category] || categoryColors.default;

  // Text colors
  const textColor = isDark ? '#f8fafc' : '#1e293b';
  const borderColor = isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)';

  // Selection state
  const selectedBorderColor = 'rgba(13, 148, 136, 0.3)';
  const selectedShadow = selected
    ? '0 8px 16px rgba(13, 148, 136, 0.3)'
    : '0 4px 8px rgba(0, 0, 0, 0.1)';
  const selectedScale = selected ? 1.05 : 1;

  return (
    <div
      style={{
        background: bgColor,
        border: `2px solid ${borderColor}`,
        borderRadius: '12px',
        padding: '12px 16px',
        minWidth: '120px',
        minHeight: '80px',
        boxShadow: selectedShadow,
        transform: `scale(${selectedScale})`,
        transition: 'all 0.2s ease',
        cursor: 'pointer',
        position: 'relative',
        outline: selected ? `2px solid ${selectedBorderColor}` : 'none',
        outlineOffset: '2px',
      }}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {/* Input Handle (Top) */}
      <Handle
        type="target"
        position={Position.Top}
        style={{
          background: '#0d9488',
          width: '10px',
          height: '10px',
          border: '2px solid white',
          borderRadius: '50%',
        }}
      />

      {/* Node Content */}
      <div
        style={{
          fontSize: '14px',
          fontWeight: '600',
          lineHeight: '1.4',
          textAlign: 'center',
          color: textColor,
          marginBottom: '4px',
          wordWrap: 'break-word',
        }}
      >
        {data.label || 'Node'}
      </div>

      {data.category && (
        <div
          style={{
            fontSize: '12px',
            opacity: 0.75,
            textAlign: 'center',
            color: textColor,
            wordWrap: 'break-word',
          }}
        >
          {data.category}
        </div>
      )}

      {/* Output Handle (Bottom) */}
      <Handle
        type="source"
        position={Position.Bottom}
        style={{
          background: '#059669',
          width: '10px',
          height: '10px',
          border: '2px solid white',
          borderRadius: '50%',
        }}
      />

      {/* Tooltip */}
      {showTooltip && (data.description || (data.skills && data.skills.length > 0)) && (
        <div
          style={{
            position: 'absolute',
            bottom: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '400px',
            maxWidth: '90vw',
            padding: '16px',
            borderRadius: '8px',
            marginBottom: '8px',
            pointerEvents: 'none',
            zIndex: 50,
            background: isDark ? '#1e293b' : '#ffffff',
            color: isDark ? '#f8fafc' : '#1e293b',
            border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)'}`,
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          }}
        >
          {data.description && (
            <div
              style={{
                fontSize: '14px',
                lineHeight: '1.6',
                marginBottom: '12px',
                wordWrap: 'break-word',
              }}
            >
              {data.description}
            </div>
          )}
          {data.skills && data.skills.length > 0 && (
            <div>
              <div
                style={{
                  fontSize: '12px',
                  fontWeight: '600',
                  opacity: 0.75,
                  marginBottom: '4px',
                  wordWrap: 'break-word',
                }}
              >
                Skills:
              </div>
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '4px',
                }}
              >
                {data.skills.map((skill, idx) => (
                  <span
                    key={idx}
                    style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      background: isDark ? '#334155' : '#e2e8f0',
                      color: isDark ? '#cbd5e1' : '#475569',
                    }}
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const nodeTypes = {
  concept: ConceptNode,
  default: ConceptNode,
};

/**
 * MindMap Component - Exact match to Content Studio spec
 */
export const MindMap = ({ data, className = '' }) => {
  const { theme } = useApp();
  const isDark = theme === 'night-mode' || theme === 'dark';

  // Normalize nodes
  const normalizedNodes = useMemo(() => {
    if (!data?.nodes || !Array.isArray(data.nodes)) return [];

    return data.nodes.map((node) => {
      // Handle nested data structure
      if (node.data && typeof node.data === 'object' && !node.data.label && node.data.data) {
        return {
          id: node.id,
          type: node.type || 'concept',
          data: {
            label: node.data.data.label || node.data.data.group || node.id,
            description: node.data.data.description || '',
            category: node.data.data.group || node.data.data.category || 'default',
            skills: node.data.data.skills || [],
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
            description: node.data.description || '',
            category: node.data.category || node.data.group || 'default',
            skills: node.data.skills || [],
            ...node.data,
          },
          position: node.position || { x: 0, y: 0 },
          style: node.style || {},
        };
      }

      // Legacy format
      return {
        id: node.id,
        type: node.type || 'concept',
        data: {
          label: node.label || node.data?.group || node.id,
          description: node.description || node.data?.description || '',
          category: node.category || node.data?.group || 'default',
          skills: node.skills || [],
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
      type: 'smoothstep',
      label: edge.label || '',
      animated: false, // Spec says false by default
      style: {
        stroke: isDark ? '#64748b' : '#94a3b8',
        strokeWidth: 2,
      },
      labelStyle: {
        fill: isDark ? '#cbd5e1' : '#475569',
        fontWeight: 500,
        fontSize: '11px',
      },
      labelBgStyle: {
        fill: isDark ? '#1e293b' : '#ffffff',
        fillOpacity: 0.9,
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
      <div
        className={`w-full border-2 border-dashed rounded-lg flex items-center justify-center ${className}`}
        style={{
          height: '600px',
          borderRadius: '12px',
          borderWidth: '1px',
          borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
          background: isDark ? '#0f172a' : '#f8fafc',
        }}
      >
        <p style={{ color: isDark ? '#94a3b8' : '#64748b' }}>No mind map data available</p>
      </div>
    );
  }

  return (
    <div
      className={`w-full ${className}`}
      style={{
        height: '600px',
        borderRadius: '12px',
        border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
        background: isDark ? '#0f172a' : '#f8fafc',
        overflow: 'hidden',
      }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        minZoom={0.3}
        maxZoom={1.2}
        style={{
          background: isDark ? '#0f172a' : '#f8fafc',
        }}
      >
        {/* Background Pattern - Dots */}
        <Background
          variant="dots"
          gap={20}
          size={1}
          color={isDark ? '#334155' : '#cbd5e1'}
        />

        {/* Controls */}
        <Controls
          style={{
            button: {
              backgroundColor: isDark ? '#1e293b' : '#ffffff',
              color: isDark ? '#f8fafc' : '#1e293b',
              border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)'}`,
            },
          }}
        />

        {/* MiniMap */}
        <MiniMap
          style={{
            backgroundColor: isDark ? '#0f172a' : '#f8fafc',
            border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
          }}
          nodeColor={(node) => {
            return isDark ? '#1e293b' : '#ffffff';
          }}
          nodeStrokeColor={(node) => {
            return isDark ? '#0d9488' : '#059669';
          }}
          maskColor={isDark ? 'rgba(15, 23, 42, 0.6)' : 'rgba(248, 250, 252, 0.6)'}
        />
      </ReactFlow>
    </div>
  );
};
