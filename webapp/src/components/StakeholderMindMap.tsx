import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { motion, AnimatePresence } from 'motion/react';
import { Network, ZoomIn, ZoomOut, Maximize2, Loader2, Sparkles, X } from 'lucide-react';
import { generateStakeholderMindMap } from '../services/aiService';

interface StakeholderMindMapProps {
  stakeholders: any[];
  projectName: string;
  onClose: () => void;
}

export default function StakeholderMindMap({ stakeholders, projectName, onClose }: StakeholderMindMapProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const mindMapData = await generateStakeholderMindMap(stakeholders, projectName);
      setData(mindMapData);
      setLoading(false);
    }
    loadData();
  }, [stakeholders, projectName]);

  useEffect(() => {
    if (!data || !svgRef.current || !containerRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', [-width / 2, -height / 2, width, height]);

    svg.selectAll('*').remove();

    const g = svg.append('g');

    // Zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 5])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom as any);

    const tree = d3.tree().size([2 * Math.PI, Math.min(width, height) / 2.5]);

    const root = d3.hierarchy(data);
    tree(root as any);

    // Links
    g.append('g')
      .attr('fill', 'none')
      .attr('stroke', '#a3b20b')
      .attr('stroke-opacity', 0.2)
      .attr('stroke-width', 1.5)
      .selectAll('path')
      .data(root.links())
      .join('path')
      .attr('d', d3.linkRadial<any, any>()
        .angle((d: any) => d.x)
        .radius((d: any) => d.y) as any
      );

    // Nodes
    const node = g.append('g')
      .selectAll('g')
      .data(root.descendants())
      .join('g')
      .attr('transform', (d: any) => `
        rotate(${(d.x * 180) / Math.PI - 90})
        translate(${d.y},0)
      `);

    node.append('circle')
      .attr('fill', (d: any) => d.children ? '#1e1e1e' : '#a3b20b')
      .attr('r', (d: any) => d.children ? 4 : 2.5)
      .style('filter', (d: any) => d.children ? '' : 'drop-shadow(0 0 4px #a3b20b)');

    node.append('text')
      .attr('dy', '0.31em')
      .attr('x', (d: any) => (d.x < Math.PI ? 6 : -6))
      .attr('text-anchor', (d: any) => (d.x < Math.PI ? 'start' : 'end'))
      .attr('transform', (d: any) => (d.x >= Math.PI ? 'rotate(180)' : null))
      .text((d: any) => d.data.name)
      .attr('fill', '#1e1e1e')
      .style('font-size', (d: any) => d.depth === 0 ? '12px' : '9px')
      .style('font-weight', (d: any) => d.depth === 0 ? '900' : '700')
      .style('text-transform', 'uppercase')
      .style('letter-spacing', '0.1em')
      .clone(true).lower()
      .attr('stroke', 'white')
      .attr('stroke-width', 3);

    // Initial transition/zoom
    svg.transition().duration(750).call(zoom.transform as any, d3.zoomIdentity);

  }, [data]);

  return (
    <div className="fixed inset-0 z-[100] bg-white/95 backdrop-blur-3xl flex flex-col animate-in fade-in duration-500">
      {/* Header */}
      <div className="p-8 border-b border-zinc-100 flex items-center justify-between bg-white/50 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-architect-coal flex items-center justify-center">
            <Network className="w-6 h-6 text-olive-primary" />
          </div>
          <div>
            <h2 className="text-xl font-black text-architect-coal uppercase tracking-widest flex items-center gap-2">
              Stakeholder Semantic Map
              <Sparkles className="w-4 h-4 text-olive-primary animate-pulse" />
            </h2>
            <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mt-1">
              AI-Synthesized Relationship Hub • {projectName}
            </p>
          </div>
        </div>
        <button 
          onClick={onClose}
          className="p-4 bg-zinc-50 hover:bg-zinc-100 transition-colors border border-zinc-100"
        >
          <X className="w-6 h-6 text-zinc-400" />
        </button>
      </div>

      {/* Main Canvas Area */}
      <div className="flex-1 relative overflow-hidden" ref={containerRef}>
        {loading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
             <Loader2 className="w-12 h-12 text-olive-primary animate-spin mb-6" />
             <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.4em] animate-pulse">Scanning Stakeholder Matrix...</p>
          </div>
        ) : (
          <svg 
            ref={svgRef} 
            className="w-full h-full cursor-grab active:cursor-grabbing"
          />
        )}

        {/* Legend/Controls */}
        {!loading && (
          <div className="absolute bottom-8 left-8 space-y-4">
             <div className="bg-white/80 backdrop-blur-sm border border-zinc-100 p-6 space-y-3">
                <div className="flex items-center gap-3">
                   <div className="w-3 h-3 bg-architect-coal" />
                   <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Entity Groups</span>
                </div>
                <div className="flex items-center gap-3">
                   <div className="w-3 h-3 bg-olive-primary rounded-full shadow-[0_0_8px_#a3b20b]" />
                   <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Active Personnel</span>
                </div>
             </div>
             
             <div className="flex gap-1">
                <button className="p-3 bg-white border border-zinc-100 text-zinc-400 hover:text-olive-primary transition-colors">
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button className="p-3 bg-white border border-zinc-100 text-zinc-400 hover:text-olive-primary transition-colors">
                  <ZoomOut className="w-4 h-4" />
                </button>
                <button className="p-3 bg-white border border-zinc-100 text-zinc-400 hover:text-olive-primary transition-colors">
                  <Maximize2 className="w-4 h-4" />
                </button>
             </div>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="p-4 bg-zinc-900 text-center">
         <p className="text-[8px] font-black text-zinc-500 uppercase tracking-[0.5em]">
           Strategic Oversight Node • Architectural Governance Framework
         </p>
      </div>
    </div>
  );
}
