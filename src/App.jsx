import React, { useState, useRef, useEffect, useCallback } from 'react'
import * as d3 from 'd3'

// ── Colors ────────────────────────────────────────────────────────────────
const CHART_COLORS = ['#6c63ff','#10d9a0','#f59e0b','#38bdf8','#b06cff','#f87171','#34d399','#fb923c','#a78bfa','#60a5fa','#fbbf24','#4ade80']
const NODE_COLORS  = d3.schemeTableau10

const nodeColor = (group) => {
  if (group === 'source') return '#10d9a0'
  if (group === 'target') return '#f87171'
  if (group === 'path')   return '#f59e0b'
  if (group != null)      return NODE_COLORS[Number(group) % NODE_COLORS.length]
  return '#6c63ff'
}

// ── Shared styles ─────────────────────────────────────────────────────────
const S = {
  app:       { display:'flex', flexDirection:'column', height:'100vh', fontFamily:"'Segoe UI',system-ui,sans-serif", background:'#ffffff', color:'#000000', overflow:'hidden' },
  header:    { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 20px', height:52, background:'#ffffff', borderBottom:'1px solid #e2e2e2', flexShrink:0 },
  hTitle:    { fontSize:16, fontWeight:700, color:'#000000' },
  hAccent:   { color:'#6c63ff' },
  hMeta:     { display:'flex', gap:10, alignItems:'center' },
  pill:      { fontSize:11, padding:'3px 10px', border:'1px solid #2a2a38', borderRadius:20, color:'#000000', fontFamily:'monospace' },
  body:      { display:'flex', flex:1, minHeight:0, overflow:'hidden' },
  panel:     { width:300, flexShrink:0, background:'#ffffff', borderRight:'1px solid #2a2a38', display:'flex', flexDirection:'column', padding:16, gap:14, overflowY:'auto' },
  slabel:    { fontSize:10, fontWeight:600, letterSpacing:'0.12em', color:'#44445a', marginBottom:6, textTransform:'uppercase' },
  textarea:  { width:'100%', height:160, background:'#ffffff', border:'1px solid #2a2a38', borderRadius:8, color:'#000000', fontSize:12, fontFamily:'arial', lineHeight:1.7, padding:10, resize:'vertical', outline:'none', boxSizing:'border-box' },
  btnPri:    (dis) => ({ width:'100%', padding:'11px 0', background:dis?'#3a3860':'#6c63ff', color:dis?'#7a7a99':'#fff', border:'none', borderRadius:8, fontSize:13, fontWeight:600, cursor:dis?'not-allowed':'pointer', fontFamily:'inherit' }),
  btnSec:    { width:'100%', padding:'8px 0', background:'transparent', color:'#7a7a99', border:'1px solid #2a2a38', borderRadius:8, fontSize:12, cursor:'pointer', fontFamily:'inherit' },
  status:    (t) => ({ padding:'9px 12px', borderRadius:6, fontSize:12, lineHeight:1.5, background:'#ffffff', border:`1px solid ${t==='error'?'#ff0000':t==='loading'?'#2a2a5a':'#00ff6e'}`, color:t==='error'?'#f87171':t==='loading'?'#000000':'#4ade80' }),
  canvas:    { flex:1, position:'relative', background:'#ffffff', overflow:'hidden' },
  svgEl:     { width:'100%', height:'100%', display:'block' },
  empty:     { position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', textAlign:'center', pointerEvents:'none' },
  hint:      { position:'absolute', bottom:14, left:'50%', transform:'translateX(-50%)', fontSize:11, color:'#000000', background:'#ffffff', border:'1px solid #2a2a38', borderRadius:20, padding:'4px 14px', pointerEvents:'none', whiteSpace:'nowrap' },
  tooltip:   { position:'fixed', background:'#1e1e28', border:'1px solid #2a2a38', borderRadius:8, padding:'10px 13px', fontSize:12, pointerEvents:'none', zIndex:9999, maxWidth:220, boxShadow:'0 8px 24px rgba(0,0,0,.5)', color:'#e0e0f0' },
  infoPanel: { width:220, flexShrink:0, background:'#ffffff', color:'#000000', borderLeft:'1px solid #2a2a38', display:'flex', flexDirection:'column', padding:'14px 12px', gap:14, overflowY:'auto' },
  divider:   { height:1, background:'#2a2a38', margin:'0 -12px' },
  tabs:      { display:'flex', gap:4, marginBottom:2 },
  tab:       (act) => ({ flex:1, padding:'9px 0', background:act?'#6c63ff':'transparent', color:act?'#ffffff':'#000000', border:`1px solid ${act?'#6c63ff':'#2a2a38'}`, borderRadius:6, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit', transition:'all .15s' }),
  algoBadge: (c) => ({ display:'inline-block', padding:'2px 8px', borderRadius:12, fontSize:10, fontWeight:700, background:c+'22', border:`1px solid ${c}44`, color:c }),
}


// ═══════════════════════════════════════════════════════════════════════════
// CHART CANVAS  (bar / line / pie)
// ═══════════════════════════════════════════════════════════════════════════
function ChartCanvas({ chart }) {
  const svgRef = useRef(null)

  useEffect(() => {
    if (!chart || !svgRef.current) return
    const el = svgRef.current
    const W = el.clientWidth || 700
    const H = el.clientHeight || 500
    const svg = d3.select(el)
    svg.selectAll('*').remove()

    const margin = { top:40, right:40, bottom:70, left:60 }
    const iW = W - margin.left - margin.right
    const iH = H - margin.top - margin.bottom
    const g  = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`)

    svg.append('text').attr('x', W/2).attr('y', 22)
      .attr('text-anchor','middle').attr('fill','#000').attr('font-size',14).attr('font-weight',600).attr('font-family','sans-serif')
      .text(chart.title)

    const { chart_type, data, x_label, y_label } = chart

    if (chart_type === 'bar') {
      const x = d3.scaleBand().domain(data.map(d=>d.label)).range([0,iW]).padding(0.25)
      const y = d3.scaleLinear().domain([0, d3.max(data,d=>d.value)*1.1]).nice().range([iH,0])
      g.append('g').call(d3.axisLeft(y).tickSize(-iW).tickFormat(''))
        .call(g=>g.select('.domain').remove())
        .call(g=>g.selectAll('line').attr('stroke','#1e1e28').attr('stroke-dasharray','3,3'))
      g.selectAll('rect').data(data).enter().append('rect')
        .attr('x',d=>x(d.label)).attr('y',d=>y(d.value)).attr('width',x.bandwidth()).attr('height',d=>iH-y(d.value))
        .attr('fill',(d,i)=>CHART_COLORS[i%CHART_COLORS.length]).attr('rx',4).attr('opacity',0.85)
      g.selectAll('.val').data(data).enter().append('text').attr('class','val')
        .attr('x',d=>x(d.label)+x.bandwidth()/2).attr('y',d=>y(d.value)-6)
        .attr('text-anchor','middle').attr('fill','#7a7a99').attr('font-size',11).attr('font-family','monospace')
        .text(d=>d.value%1===0?d.value:d.value.toFixed(1))
      g.append('g').attr('transform',`translate(0,${iH})`).call(d3.axisBottom(x))
        .call(g=>g.select('.domain').attr('stroke','#2a2a38'))
        .call(g=>g.selectAll('line').attr('stroke','#2a2a38'))
        .selectAll('text').attr('fill','#7a7a99').attr('font-size',11).attr('transform','rotate(-25)').style('text-anchor','end')
      g.append('g').call(d3.axisLeft(y).ticks(5))
        .call(g=>g.select('.domain').attr('stroke','#2a2a38'))
        .call(g=>g.selectAll('line').attr('stroke','#2a2a38'))
        .selectAll('text').attr('fill','#7a7a99').attr('font-size',11)
      if (x_label) svg.append('text').attr('x',margin.left+iW/2).attr('y',H-8).attr('text-anchor','middle').attr('fill','#44445a').attr('font-size',11).attr('font-family','sans-serif').text(x_label)
      if (y_label) svg.append('text').attr('transform',`translate(14,${margin.top+iH/2}) rotate(-90)`).attr('text-anchor','middle').attr('fill','#44445a').attr('font-size',11).attr('font-family','sans-serif').text(y_label)
    }

    else if (chart_type === 'line') {
      const x = d3.scalePoint().domain(data.map(d=>d.label)).range([0,iW]).padding(0.3)
      const y = d3.scaleLinear().domain([0,d3.max(data,d=>d.value)*1.1]).nice().range([iH,0])
      g.append('g').call(d3.axisLeft(y).tickSize(-iW).tickFormat(''))
        .call(g=>g.select('.domain').remove())
        .call(g=>g.selectAll('line').attr('stroke','#1e1e28').attr('stroke-dasharray','3,3'))
      const area = d3.area().x(d=>x(d.label)).y0(iH).y1(d=>y(d.value)).curve(d3.curveMonotoneX)
      g.append('path').datum(data).attr('fill','#6c63ff').attr('opacity',0.08).attr('d',area)
      const line = d3.line().x(d=>x(d.label)).y(d=>y(d.value)).curve(d3.curveMonotoneX)
      g.append('path').datum(data).attr('fill','none').attr('stroke','#6c63ff').attr('stroke-width',2.5).attr('d',line)
      g.selectAll('circle').data(data).enter().append('circle')
        .attr('cx',d=>x(d.label)).attr('cy',d=>y(d.value)).attr('r',5)
        .attr('fill','#6c63ff').attr('stroke','#fff').attr('stroke-width',2)
      g.selectAll('.val').data(data).enter().append('text').attr('class','val')
        .attr('x',d=>x(d.label)).attr('y',d=>y(d.value)-12)
        .attr('text-anchor','middle').attr('fill','#7a7a99').attr('font-size',11).attr('font-family','monospace')
        .text(d=>d.value%1===0?d.value:d.value.toFixed(1))
      g.append('g').attr('transform',`translate(0,${iH})`).call(d3.axisBottom(x))
        .call(g=>g.select('.domain').attr('stroke','#2a2a38'))
        .call(g=>g.selectAll('line').attr('stroke','#2a2a38'))
        .selectAll('text').attr('fill','#7a7a99').attr('font-size',11).attr('transform','rotate(-25)').style('text-anchor','end')
      g.append('g').call(d3.axisLeft(y).ticks(5))
        .call(g=>g.select('.domain').attr('stroke','#2a2a38'))
        .call(g=>g.selectAll('line').attr('stroke','#2a2a38'))
        .selectAll('text').attr('fill','#7a7a99').attr('font-size',11)
      if (x_label) svg.append('text').attr('x',margin.left+iW/2).attr('y',H-8).attr('text-anchor','middle').attr('fill','#44445a').attr('font-size',11).attr('font-family','sans-serif').text(x_label)
      if (y_label) svg.append('text').attr('transform',`translate(14,${margin.top+iH/2}) rotate(-90)`).attr('text-anchor','middle').attr('fill','#44445a').attr('font-size',11).attr('font-family','sans-serif').text(y_label)
    }

    else if (chart_type === 'pie') {
      const cx=iW/2, cy=iH/2
      const radius = Math.min(iW,iH)/2-10
      const pie   = d3.pie().value(d=>d.value).sort(null)
      const arc   = d3.arc().innerRadius(radius*0.45).outerRadius(radius)
      const arcs  = pie(data)
      const total = d3.sum(data,d=>d.value)
      g.selectAll('path').data(arcs).enter().append('path')
        .attr('transform',`translate(${cx},${cy})`).attr('d',arc)
        .attr('fill',(d,i)=>CHART_COLORS[i%CHART_COLORS.length]).attr('stroke','#fff').attr('stroke-width',2).attr('opacity',0.88)
      g.selectAll('.pct').data(arcs).enter().append('text').attr('class','pct')
        .attr('transform',d=>`translate(${cx+arc.centroid(d)[0]},${cy+arc.centroid(d)[1]})`)
        .attr('text-anchor','middle').attr('dominant-baseline','central')
        .attr('fill','#fff').attr('font-size',11).attr('font-weight',600).attr('font-family','monospace')
        .text(d=>`${Math.round(d.value/total*100)}%`)
    }
  }, [chart])

  return (
    <div style={S.canvas}>
      <svg ref={svgRef} style={S.svgEl}/>
      {!chart && <div style={S.empty}><p style={{fontSize:14,color:'#44445a'}}>chart will appear here</p></div>}
      {chart && (
        <div style={S.hint}>
          {['bar','line','pie'].map((t,i)=>(
            <span key={t}>
              {i>0 && <span style={{color:'#2a2a38',margin:'0 6px'}}>·</span>}
              <span style={{color:chart.chart_type===t?'#6c63ff':'#888'}}>{t}</span>
            </span>
          ))}
          <span style={{color:'#2a2a38',margin:'0 6px'}}>·</span>
          <span>detected: <strong style={{color:'#6c63ff'}}>{chart.chart_type}</strong></span>
        </div>
      )}
    </div>
  )
}


// GRAPH CANVAS  (force-directed / shortest-path / tree / dag / heatmap)
function GraphCanvas({ graph, onNodeClick }) {
  const svgRef     = useRef(null)
  const simRef     = useRef(null)
  const tooltipRef = useRef(null)

  useEffect(() => {
    if (!graph || !svgRef.current) return

    const el = svgRef.current
    const W  = el.clientWidth  || 800
    const H  = el.clientHeight || 600

    if (simRef.current) simRef.current.stop()

    const svg = d3.select(el)
    svg.selectAll('*').remove()

    const tip = d3.select(tooltipRef.current)

    // === HEATMAP ===
    if (graph.graph_type === 'heatmap') {
      const dist = graph.algorithm_result?.distances
      if (!dist) return

      const labels  = graph.nodes.map(n=>n.id)
      const margin  = { top:60, right:20, bottom:20, left:60 }
      const size    = Math.min((W-margin.left-margin.right), (H-margin.top-margin.bottom))
      const cell    = size / labels.length
      const g       = svg.append('g').attr('transform',`translate(${margin.left},${margin.top})`)

      const flat    = labels.flatMap(r=>labels.map(c=>({ r, c, v:dist[r]?.[c] ?? Infinity })))
      const maxVal  = d3.max(flat.filter(d=>isFinite(d.v)), d=>d.v) || 1
      const color   = d3.scaleSequential(d3.interpolateYlOrRd).domain([0, maxVal])

      g.selectAll('rect').data(flat).enter().append('rect')
        .attr('x', d=>labels.indexOf(d.c)*cell).attr('y', d=>labels.indexOf(d.r)*cell)
        .attr('width', cell-2).attr('height', cell-2).attr('rx', 3)
        .attr('fill', d=>isFinite(d.v)?color(d.v):'#222')

      g.selectAll('.cell-val').data(flat).enter().append('text').attr('class','cell-val')
        .attr('x', d=>labels.indexOf(d.c)*cell+cell/2).attr('y', d=>labels.indexOf(d.r)*cell+cell/2+4)
        .attr('text-anchor','middle').attr('font-size', Math.max(8, Math.min(12, cell*0.35)))
        .attr('fill','#fff').attr('font-family','monospace')
        .text(d=>isFinite(d.v)?d.v.toFixed(1):'∞')

      // Column labels
      g.selectAll('.clabel').data(labels).enter().append('text').attr('class','clabel')
        .attr('x',(d,i)=>i*cell+cell/2).attr('y',-8).attr('text-anchor','middle')
        .attr('font-size',11).attr('fill','#6c63ff').attr('font-weight',600).text(d=>d)

      // Row labels
      g.selectAll('.rlabel').data(labels).enter().append('text').attr('class','rlabel')
        .attr('x',-8).attr('y',(d,i)=>i*cell+cell/2+4).attr('text-anchor','end')
        .attr('font-size',11).attr('fill','#6c63ff').attr('font-weight',600).text(d=>d)

      svg.append('text').attr('x',W/2).attr('y',26).attr('text-anchor','middle')
        .attr('fill','#000').attr('font-size',14).attr('font-weight',600).text(graph.title)
      return
    }

    // === TREE layout ===
    if (graph.graph_type === 'tree') {
      const margin  = { top:50, right:30, bottom:30, left:30 }
      const iW      = W - margin.left - margin.right
      const iH      = H - margin.top  - margin.bottom

      const parentOf = {}
      graph.edges.forEach(e=>{ parentOf[e.target] = e.source })
      const rootId = graph.nodes.find(n=>!parentOf[n.id])?.id || graph.nodes[0]?.id

      // === Build hirarchy ===
      function buildTree(id) {
        const children = graph.edges.filter(e=>e.source===id).map(e=>buildTree(e.target))
        return { id, label: graph.nodes.find(n=>n.id===id)?.label || id, children }
      }
      const hierarchy = d3.hierarchy(buildTree(rootId))
      d3.tree().size([iW, iH])(hierarchy)

      const g = svg.append('g').attr('transform',`translate(${margin.left},${margin.top})`)

      g.selectAll('.link').data(hierarchy.links()).enter().append('path').attr('class','link')
        .attr('fill','none').attr('stroke','#6c63ff').attr('stroke-width',1.5).attr('opacity',0.6)
        .attr('d', d3.linkVertical().x(d=>d.x).y(d=>d.y))

      const node = g.selectAll('.node').data(hierarchy.descendants()).enter()
        .append('g').attr('class','node').attr('transform',d=>`translate(${d.x},${d.y})`)
        .style('cursor','pointer')
        .on('click', (_,d)=>onNodeClick && onNodeClick(d.data))

      node.append('circle').attr('r',16)
        .attr('fill', d=>d.depth===0?'#10d9a0':d.children?'#6c63ff':'#f59e0b')
        .attr('stroke','#fff').attr('stroke-width',2)

      node.append('text').attr('text-anchor','middle').attr('dominant-baseline','central')
        .attr('fill','#fff').attr('font-size',11).attr('font-weight',600)
        .text(d=>d.data.label.length>8?d.data.label.slice(0,7)+'…':d.data.label)

      svg.append('text').attr('x',W/2).attr('y',24).attr('text-anchor','middle')
        .attr('fill','#000').attr('font-size',14).attr('font-weight',600).text(graph.title)
      return
    }

    // === FORCE-DIRECTED / SHORTEST-PATH ===
    const nodes = graph.nodes.map(n=>({ ...n }))
    const links = graph.edges.map(e=>({ ...e }))

    // Defs: arrow markers
    const defs = svg.append('defs')
    ;[['arr','#666'],['arr-hi','#f59e0b'],['arr-path','#10d9a0']].forEach(([id,col])=>{
      defs.append('marker').attr('id',id)
        .attr('viewBox','0 -4 8 8').attr('refX',22).attr('refY',0)
        .attr('markerWidth',6).attr('markerHeight',6).attr('orient','auto')
        .append('path').attr('d','M0,-4L8,0L0,4').attr('fill',col)
    })

    const zoomG = svg.append('g')
    svg.call(d3.zoom().scaleExtent([0.2,4]).on('zoom',e=>zoomG.attr('transform',e.transform)))

    // Force simulation
    const sim = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id(d=>d.id).distance(d=>90+(d.weight||1)*4).strength(0.8))
      .force('charge', d3.forceManyBody().strength(-280))
      .force('center', d3.forceCenter(W/2, H/2))
      .force('collision', d3.forceCollide(26))
    simRef.current = sim

    // Edges
    const link = zoomG.append('g').selectAll('line').data(links).enter().append('line')
      .attr('stroke',  d=>d.highlighted?'#f59e0b':'#cccccc')
      .attr('stroke-width', d=>d.highlighted?3:1.5)
      .attr('stroke-opacity', d=>d.highlighted?1:0.5)
      .attr('marker-end', d=>graph.directed?(d.highlighted?'url(#arr-hi)':'url(#arr)'):'')

    const linkLabel = zoomG.append('g').selectAll('text').data(links.filter(d=>d.weight&&d.weight!==1)).enter()
      .append('text').attr('font-size',10).attr('fill', d=>d.highlighted?'#f59e0b':'#888')
      .attr('text-anchor','middle').attr('font-family','monospace').text(d=>d.weight)

    // Node circles
    const rOf = d=>d.value ? Math.max(14, Math.min(28, d.value)) : 16

    const node = zoomG.append('g').selectAll('circle').data(nodes).enter().append('circle')
      .attr('r', rOf)
      .attr('fill', d=>nodeColor(d.group))
      .attr('stroke','#fff').attr('stroke-width',2)
      .style('cursor','pointer')
      .on('mouseover', (event,d)=>{
        d3.select(event.currentTarget).attr('stroke','#f59e0b').attr('stroke-width',3)
        tip.style('opacity',1)
          .style('left',(event.clientX+12)+'px').style('top',(event.clientY-10)+'px')
          .html(`<strong style="color:#fff">${d.label}</strong><br/>`+
                (d.group!=null?`<span style="color:#aaa">group: ${d.group}</span><br/>`:'') +
                (d.value!=null?`<span style="color:#aaa">value: ${d.value}</span>`:''))
      })
      .on('mousemove', event=>{
        tip.style('left',(event.clientX+12)+'px').style('top',(event.clientY-10)+'px')
      })
      .on('mouseout', event=>{
        d3.select(event.currentTarget).attr('stroke','#fff').attr('stroke-width',2)
        tip.style('opacity',0)
      })
      .on('click', (_,d)=>onNodeClick && onNodeClick(d))
      .call(d3.drag()
        .on('start', (event,d)=>{ if(!event.active) sim.alphaTarget(0.3).restart(); d.fx=d.x; d.fy=d.y })
        .on('drag',  (event,d)=>{ d.fx=event.x; d.fy=event.y })
        .on('end',   (event,d)=>{ if(!event.active) sim.alphaTarget(0); d.fx=null; d.fy=null })
      )

    // Node labels
    const label = zoomG.append('g').selectAll('text').data(nodes).enter().append('text')
      .attr('text-anchor','middle').attr('dominant-baseline','central')
      .attr('fill','#fff').attr('font-size',11).attr('font-weight',700)
      .attr('font-family','sans-serif').style('pointer-events','none')
      .text(d=>d.label.length>8?d.label.slice(0,7)+'…':d.label)

    // Title
    svg.append('text').attr('x',W/2).attr('y',24).attr('text-anchor','middle')
      .attr('fill','#000').attr('font-size',14).attr('font-weight',600).text(graph.title)

    sim.on('tick',()=>{
      link.attr('x1',d=>d.source.x).attr('y1',d=>d.source.y).attr('x2',d=>d.target.x).attr('y2',d=>d.target.y)
      linkLabel.attr('x',d=>(d.source.x+d.target.x)/2).attr('y',d=>(d.source.y+d.target.y)/2-5)
      node.attr('cx',d=>d.x).attr('cy',d=>d.y)
      label.attr('x',d=>d.x).attr('y',d=>d.y)
    })

    return () => { sim.stop() }
  }, [graph])

  const gtLabel = {
    force_directed: 'force-directed',
    shortest_path:  'shortest path',
    tree:           'tree',
    dag:            'DAG',
    heatmap:        'heatmap',
  }

  return (
    <div style={S.canvas}>
      {/* Dot-grid background */}
      <svg style={{position:'absolute',inset:0,width:'100%',height:'100%',pointerEvents:'none'}}>
        <defs><pattern id="dots" x="0" y="0" width="28" height="28" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" fill="#e0e0e0"/></pattern></defs>
        <rect width="100%" height="100%" fill="url(#dots)"/>
      </svg>

      <svg ref={svgRef} style={S.svgEl}/>

      {/* Tooltip */}
      <div ref={tooltipRef} style={{...S.tooltip, opacity:0, transition:'opacity .12s'}}/>

      {!graph && (
        <div style={S.empty}>
          <p style={{fontSize:14,color:'#44445a'}}>graph will appear here</p>
          <p style={{fontSize:11,color:'#888',marginTop:4}}>supports Dijkstra · BFS · DFS · Kruskal · PageRank · community detection</p>
        </div>
      )}
      {graph && (
        <div style={S.hint}>
          {gtLabel[graph.graph_type] || graph.graph_type}
          {graph.algorithm && graph.algorithm!=='none' && (
            <> · <span style={{color:'#6c63ff'}}>{graph.algorithm}</span></>
          )}
          <span style={{color:'#aaa'}}> · drag nodes · scroll to zoom</span>
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════════════════
export default function App() {
  const [tab, setTab]     = useState('chart')
  const [text, setText]   = useState('')
  const [chart,   setChart]   = useState(null)
  const [graph,   setGraph]   = useState(null)
  const [jobId,   setJobId]   = useState(null)
  const [tokens,  setTokens]  = useState(0)
  const [loading, setLoading] = useState(false)
  const [status,  setStatus]  = useState(null)
  const [selNode, setSelNode] = useState(null)

  // === Example loaders ===
  const chartExample = `In the Computer Science class for Masters degree, there are 12 students: 1 from Indonesia, 1 from Russia, 1 from Japan, 3 from Africa, 1 from Slovakia, and the rest are from China.`

  const graphExample = `graph = {
    'A': {'B': 4, 'C': 2},
    'B': {'D': 5, 'C': 1},
    'C': {'B': 1, 'D': 8, 'E': 10},
    'D': {'E': 2},
    'E': {}
}
Find shortest path from A to E using Dijkstra algorithm.`

  const loadExample = () => {
    setText(tab === 'chart' ? chartExample : graphExample)
    setSelNode(null)
  }

  // === Generate ===
  const generate = useCallback(async () => {
    const trimmed = text.trim()
    if (!trimmed) { setStatus({ t:'error', msg:'Please enter some text first.' }); return }
    if (trimmed.split(/\s+/).length < 5) { setStatus({ t:'error', msg:'Input too short. Add more detail.' }); return }

    setLoading(true)
    setStatus({ t:'loading', msg:`Generating ${tab}…` })
    setSelNode(null)

    try {
      const endpoint = tab === 'chart' ? '/generate-chart' : '/generate-graph'
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type':'application/json' },
        body: JSON.stringify({ text: trimmed }),
      })
      if (!res.ok) {
        const e = await res.json().catch(()=>({}))
        throw new Error(e.detail || `HTTP ${res.status}`)
      }
      const data = await res.json()
      setJobId(data.job_id)
      setTokens(data.tokens_used)

      if (tab === 'chart') {
        setChart(data.chart)
        setGraph(null)
        setStatus({ t:'ok', msg:`${data.chart.chart_type} chart · ${data.chart.data.length} data points · ${data.tokens_used} tokens` })
      } else {
        setGraph(data.graph)
        setChart(null)
        const g = data.graph
        setStatus({ t:'ok', msg:`${g.graph_type} · ${g.nodes.length} nodes · ${g.edges.length} edges · ${data.tokens_used} tokens` })
      }
    } catch (err) {
      setStatus({ t:'error', msg: err.message })
    } finally {
      setLoading(false)
    }
  }, [text, tab])

  const clearAll = () => {
    setText(''); setChart(null); setGraph(null)
    setJobId(null); setTokens(0); setStatus(null); setSelNode(null)
  }

  const switchTab = (t) => { setTab(t); setStatus(null); setSelNode(null) }

  const algoResult = graph?.algorithm_result

  return (
    <div style={S.app}>
      {/* Header */}
      <header style={S.header}>
        <div style={S.hTitle}>Testing Text<span style={S.hAccent}> to </span>Data Visualization</div>
        <div style={S.hMeta}>
          {jobId && <>
            <span style={S.pill}>job: {jobId}</span>
            {tab==='chart' && chart && <span style={S.pill}>{chart.chart_type} · {chart.data.length} pts</span>}
            {tab==='graph' && graph && <span style={S.pill}>{graph.graph_type} · {graph.nodes.length}N {graph.edges.length}E</span>}
            <span style={S.pill}>{tokens.toLocaleString()} tokens</span>
          </>}
        </div>
      </header>

      <div style={S.body}>
        {/* Left Panel */}
        <aside style={S.panel}>
          {/* Tabs */}
          <div style={S.tabs}>
            <button style={{...S.tab(tab==='chart'), borderRadius:'6px 0 0 6px'}} onClick={()=>switchTab('chart')}>Chart</button>
            <button style={{...S.tab(tab==='graph'), borderRadius:'0 6px 6px 0'}} onClick={()=>switchTab('graph')}>Graph</button>
          </div>

          {/* Description */}
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
            <p style={{...S.slabel, marginBottom:0}}>{tab==='chart'?'TEXT WITH DATA':'CODE / ALGORITHM / NETWORK'}</p>
            <button onClick={loadExample} style={{background:'none',border:'none',color:'#6c63ff',fontSize:11,cursor:'pointer',textDecoration:'underline',padding:0}}>load example</button>
          </div>

          <p style={{fontSize:11, color:'#7a7a99', lineHeight:1.6, marginTop:-6}}>
            {tab==='chart'
              ? 'Paste text with numbers. LLM auto-detects bar / line / pie.'
              : 'Paste graph code, adjacency list, algorithm pseudocode, or plain-English network description. Supports Dijkstra, BFS, DFS, Kruskal, PageRank, community detection.'}
          </p>

          {/* Textarea */}
          <textarea
            style={S.textarea}
            value={text}
            onChange={e=>setText(e.target.value)}
            onKeyDown={e=>{ if((e.ctrlKey||e.metaKey)&&e.key==='Enter') generate() }}
            placeholder={tab==='chart'
              ? 'e.g. "12 students: 5 from China, 3 from Africa…"'
              : "e.g. graph = {'A':{'B':4,'C':2}, 'B':{'D':5}}\nFind shortest path from A to D."}
          />

          {/* Status */}
          {status && (
            <div style={S.status(status.t)}>
              {status.t==='loading'?'':status.t==='error'?'✕ ':'✓ '}{status.msg}
            </div>
          )}

          {/* Buttons */}
          <button style={S.btnPri(loading||!text.trim())} onClick={generate} disabled={loading||!text.trim()}>
            {loading ? 'Generating…' : `Generate ${tab==='chart'?'Chart':'Graph'}`}
          </button>
          <button style={S.btnSec} onClick={clearAll}>Clear</button>

          {/* Graph legend */}
          {tab==='graph' && graph && graph.graph_type !== 'heatmap' && (
            <div>
              <p style={S.slabel}>NODE LEGEND</p>
              {graph.graph_type === 'shortest_path' && (
                [['#10d9a0','Source node'],['#f59e0b','On path'],['#f87171','Target node'],['#6c63ff','Other']].map(([c,l])=>(
                  <div key={l} style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
                    <div style={{width:10,height:10,borderRadius:'50%',background:c,flexShrink:0}}/>
                    <span style={{fontSize:11,color:'#555'}}>{l}</span>
                  </div>
                ))
              )}
              {(graph.graph_type==='force_directed'||graph.graph_type==='dag') && graph.nodes.some(n=>n.group!=null) && (
                [...new Set(graph.nodes.map(n=>n.group))].filter(g=>g!=null).map(g=>(
                  <div key={g} style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
                    <div style={{width:10,height:10,borderRadius:'50%',background:nodeColor(g),flexShrink:0}}/>
                    <span style={{fontSize:11,color:'#555'}}>group {g}</span>
                  </div>
                ))
              )}
            </div>
          )}
        </aside>

        {/* Canvas */}
        {tab==='chart'
          ? <ChartCanvas chart={chart}/>
          : <GraphCanvas graph={graph} onNodeClick={setSelNode}/>
        }

        {/* Right Info Panel */}
        {tab==='chart' && chart && (
          <aside style={S.infoPanel}>
            <div>
              <div style={{fontSize:13,fontWeight:600,color:'#000',lineHeight:1.4}}>{chart.title}</div>
              {chart.source_summary && <div style={{fontSize:11,color:'#444',lineHeight:1.6,marginTop:4}}>{chart.source_summary}</div>}
              <div style={{marginTop:8,...S.algoBadge('#6c63ff')}}>{chart.chart_type} chart</div>
            </div>
            <div style={S.divider}/>
            <div>
              <p style={S.slabel}>DATA POINTS</p>
              {chart.data.map((d,i)=>(
                <div key={i} style={{display:'flex',alignItems:'center',gap:8,marginBottom:7}}>
                  <div style={{width:8,height:8,borderRadius:2,background:CHART_COLORS[i%CHART_COLORS.length],flexShrink:0}}/>
                  <div style={{flex:1,minWidth:0,fontSize:11,color:'#000',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{d.label}</div>
                  <div style={{fontSize:11,color:'#6c63ff',fontFamily:'monospace',fontWeight:600,flexShrink:0}}>{d.value%1===0?d.value:d.value.toFixed(2)}</div>
                </div>
              ))}
            </div>
          </aside>
        )}

        {tab==='graph' && graph && (
          <aside style={S.infoPanel}>
            {/* Title + Summary */}
            <div>
              <div style={{fontSize:13,fontWeight:600,color:'#000',lineHeight:1.4}}>{graph.title}</div>
              {graph.source_summary && <div style={{fontSize:11,color:'#444',lineHeight:1.6,marginTop:4}}>{graph.source_summary}</div>}
              <div style={{display:'flex',gap:6,flexWrap:'wrap',marginTop:8}}>
                <span style={S.algoBadge('#6c63ff')}>{graph.graph_type}</span>
                {graph.algorithm && graph.algorithm!=='none' && <span style={S.algoBadge('#10d9a0')}>{graph.algorithm}</span>}
                {graph.directed && <span style={S.algoBadge('#f59e0b')}>directed</span>}
              </div>
            </div>

            <div style={S.divider}/>

            {algoResult && (
              <div>
                <p style={S.slabel}>ALGORITHM RESULT</p>

                {/* Dijkstra path */}
                {algoResult.path && (
                  <>
                    <div style={{fontSize:11,color:'#444',marginBottom:4}}>Shortest path:</div>
                    <div style={{fontFamily:'monospace',fontSize:12,color:'#6c63ff',wordBreak:'break-all',lineHeight:1.8}}>
                      {algoResult.path.join(' → ')}
                    </div>
                    <div style={{fontSize:11,color:'#10d9a0',marginTop:6,fontWeight:600}}>
                      Total cost: {algoResult.path_length}
                    </div>
                  </>
                )}

                {/* BFS/DFS order */}
                {algoResult.traversal_order && (
                  <>
                    <div style={{fontSize:11,color:'#444',marginBottom:4}}>Traversal order:</div>
                    <div style={{fontFamily:'monospace',fontSize:11,color:'#6c63ff',wordBreak:'break-all',lineHeight:1.8}}>
                      {algoResult.traversal_order.join(' → ')}
                    </div>
                  </>
                )}

                {/* Kruskal MST */}
                {algoResult.mst_edges && (
                  <>
                    <div style={{fontSize:11,color:'#444',marginBottom:4}}>MST edges:</div>
                    {algoResult.mst_edges.map(([u,v],i)=>(
                      <div key={i} style={{fontSize:11,fontFamily:'monospace',color:'#10d9a0'}}>
                        {u} — {v}
                      </div>
                    ))}
                    <div style={{fontSize:11,color:'#f59e0b',marginTop:6,fontWeight:600}}>
                      Total weight: {algoResult.total_weight}
                    </div>
                  </>
                )}

                {/* PageRank */}
                {algoResult.scores && (
                  <>
                    <div style={{fontSize:11,color:'#444',marginBottom:4}}>PageRank scores:</div>
                    {Object.entries(algoResult.scores)
                      .sort(([,a],[,b])=>b-a)
                      .map(([id,score])=>(
                        <div key={id} style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                          <span style={{fontSize:11,color:'#000'}}>{id}</span>
                          <span style={{fontSize:11,fontFamily:'monospace',color:'#6c63ff'}}>{score.toFixed(4)}</span>
                        </div>
                      ))
                    }
                  </>
                )}

                {/* Topological sort */}
                {algoResult.order && (
                  <>
                    <div style={{fontSize:11,color:'#444',marginBottom:4}}>Execution order:</div>
                    <div style={{fontFamily:'monospace',fontSize:11,color:'#6c63ff',wordBreak:'break-all',lineHeight:1.8}}>
                      {algoResult.order.join(' → ')}
                    </div>
                  </>
                )}

                {/* Community detection */}
                {algoResult.node_community && (
                  <>
                    <div style={{fontSize:11,color:'#444',marginBottom:4}}>Communities:</div>
                    {[...new Set(Object.values(algoResult.node_community))].map(cid=>(
                      <div key={cid} style={{display:'flex',alignItems:'center',gap:6,marginBottom:5}}>
                        <div style={{width:8,height:8,borderRadius:'50%',background:nodeColor(String(cid)),flexShrink:0}}/>
                        <span style={{fontSize:11,color:'#000'}}>
                          {Object.entries(algoResult.node_community).filter(([,v])=>v===cid).map(([k])=>k).join(', ')}
                        </span>
                      </div>
                    ))}
                  </>
                )}

                {algoResult.warning && (
                  <div style={{fontSize:11,color:'#f87171',marginTop:4}}>{algoResult.warning}</div>
                )}
              </div>
            )}

            <div style={S.divider}/>

            {/* Clicked node detail */}
            {selNode && (
              <div>
                <p style={S.slabel}>SELECTED NODE</p>
                <div style={{fontSize:13,fontWeight:600,color:'#6c63ff'}}>{selNode.label || selNode.id}</div>
                {selNode.group != null && <div style={{fontSize:11,color:'#444',marginTop:3}}>Group: {selNode.group}</div>}
                {selNode.value != null && <div style={{fontSize:11,color:'#444',marginTop:3}}>Value: {selNode.value}</div>}
              </div>
            )}

            <div style={S.divider}/>

            {/* Node list */}
            <div>
              <p style={S.slabel}>NODES ({graph.nodes.length})</p>
              <div style={{maxHeight:140,overflowY:'auto'}}>
                {graph.nodes.map((n,i)=>(
                  <div key={n.id} style={{display:'flex',alignItems:'center',gap:8,marginBottom:5,cursor:'pointer'}}
                       onClick={()=>setSelNode(n)}>
                    <div style={{width:8,height:8,borderRadius:'50%',background:nodeColor(n.group),flexShrink:0}}/>
                    <span style={{fontSize:11,color:'#000'}}>{n.label || n.id}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={S.divider}/>

            {/* Edge count */}
            <div>
              <p style={S.slabel}>EDGES ({graph.edges.length})</p>
              <div style={{maxHeight:120,overflowY:'auto'}}>
                {graph.edges.map((e,i)=>(
                  <div key={i} style={{fontSize:10,fontFamily:'monospace',color: e.highlighted?'#f59e0b':'#666',marginBottom:3}}>
                    {e.source} {graph.directed?'→':'—'} {e.target}{e.weight&&e.weight!==1?` (${e.weight})`:''}
                    {e.highlighted?' ★':''}
                  </div>
                ))}
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  )
}
