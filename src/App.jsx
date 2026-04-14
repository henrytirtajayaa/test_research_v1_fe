import React, { useState, useRef, useEffect, useCallback } from 'react'
import * as d3 from 'd3'

// ── Colors ────────────────────────────────────────────────────────────────
const NODE_COLOR = { input:'#10d9a0', process:'#6c63ff', model:'#b06cff', data:'#38bdf8', output:'#f59e0b' }
const CHART_COLORS = ['#6c63ff','#10d9a0','#f59e0b','#38bdf8','#b06cff','#f87171','#34d399','#fb923c','#a78bfa','#60a5fa','#fbbf24','#4ade80']
const nc = t => NODE_COLOR[t] || '#64748b'

// ── Shared styles ─────────────────────────────────────────────────────────
const S = {
  app:       { display:'flex', flexDirection:'column', height:'100vh', fontFamily:"'Segoe UI',system-ui,sans-serif", background:'#ffffff', color:'#000000', overflow:'hidden' },
  header:    { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 20px', height:52, background:'#ffffff', borderBottom:'1px solid #ffffff', flexShrink:0 },
  hTitle:    { fontSize:16, fontWeight:700, color:'#000000' },
  hAccent:   { color:'#6c63ff' },
  hMeta:     { display:'flex', gap:10, alignItems:'center' },
  pill:      { fontSize:11, padding:'3px 10px', border:'1px solid #2a2a38', borderRadius:20, color:'#000000', fontFamily:'monospace' },
  body:      { display:'flex', flex:1, minHeight:0, overflow:'hidden' },
  panel:     { width:300, flexShrink:0, background:'#ffffff', borderRight:'1px solid #2a2a38', display:'flex', flexDirection:'column', padding:16, gap:14, overflowY:'auto' },
  slabel:    { fontSize:10, fontWeight:600, letterSpacing:'0.12em', color:'#44445a', marginBottom:6, textTransform:'uppercase' },
  textarea:  { width:'100%', height:160, background:'#ffffff', border:'1px solid #2a2a38', borderRadius:8, color:'#000000', fontSize:12, fontFamily:'arial', lineHeight:1.7, padding:10, resize:'vertical', outline:'none', boxSizing:'border-box' },
  input:     { width:'100%', background:'#ffffff', border:'1px solid #2a2a38', borderRadius:6, color:'#000000', fontSize:12, fontFamily:'arial', padding:'7px 10px', outline:'none', boxSizing:'border-box' },
  uploadBox: (over) => ({ border:`1px dashed ${over?'#6c63ff':'#2a2a38'}`, borderRadius:8, padding:'12px 14px', cursor:'pointer', textAlign:'center', background: over?'#6c63ff11':'#0f0f13' }),
  fileChip:  { display:'flex', alignItems:'center', justifyContent:'space-between', background:'#1e1e28', border:'1px solid #2a2a38', borderRadius:6, padding:'6px 10px', fontSize:11, color:'#b0b0c8', marginTop:4 },
  btnPri:    (dis) => ({ width:'100%', padding:'11px 0', background: dis?'#3a3860':'#6c63ff', color: dis?'#7a7a99':'#fff', border:'none', borderRadius:8, fontSize:13, fontWeight:600, cursor: dis?'not-allowed':'pointer', fontFamily:'inherit' }),
  btnSec:    { width:'100%', padding:'8px 0', background:'transparent', color:'#7a7a99', border:'1px solid #2a2a38', borderRadius:8, fontSize:12, cursor:'pointer', fontFamily:'inherit' },
  status:    (t) => ({ padding:'9px 12px', borderRadius:6, fontSize:12, lineHeight:1.5, background: t==='error'?'#ffffff':t==='loading'?'#ffffff':'#ffffff', border:`1px solid ${t==='error'?'#ff0000':t==='loading'?'#2a2a5a':'#00ff6e'}`, color: t==='error'?'#f87171':t==='loading'?'#000000':'#4ade80' }),
  canvas:    { flex:1, position:'relative', background:'#ffffff', overflow:'hidden' },
  svgEl:     { width:'100%', height:'100%', display:'block' },
  empty:     { position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', textAlign:'center', pointerEvents:'none' },
  hint:      { position:'absolute', bottom:14, left:'50%', transform:'translateX(-50%)', fontSize:11, color:'#000000', background:'#ffffff', border:'1px solid #2a2a38', borderRadius:20, padding:'4px 14px', pointerEvents:'none' },
  tooltip:   { position:'absolute', background:'#ffffff', border:'1px solid #2a2a38', borderRadius:8, padding:'10px 13px', fontSize:12, pointerEvents:'none', zIndex:100, maxWidth:200, boxShadow:'0 8px 24px rgba(0,0,0,.5)' },
  infoPanel: { width:210, flexShrink:0, background:'#ffffff', color:'#000000', borderLeft:'1px solid #2a2a38', display:'flex', flexDirection:'column', padding:'14px 12px', gap:14, overflowY:'auto' },
  divider:   { height:1, background:'#2a2a38', margin:'0 -12px' },
  nodeItem:  (sel) => ({ display:'flex', alignItems:'center', gap:8, padding:'7px 8px', borderRadius:6, cursor:'pointer', border:`1px solid ${sel?'#6c63ff':'transparent'}`, background: sel?'#6c63ff18':'transparent', transition:'all .12s' }),
  // Tabs
  tabs:      { display:'flex', gap:0, marginBottom:2 },
  tab:       (act) => ({ flex:1, padding:'9px 0', background: act?'#6c63ff':'transparent', color: act?'#000000':'#000000', border:`1px solid ${act?'#6c63ff':'#2a2a38'}`, borderRadius:6, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit', transition:'all .15s' }),
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

    const margin = { top: 40, right: 40, bottom: 70, left: 60 }
    const iW = W - margin.left - margin.right
    const iH = H - margin.top - margin.bottom
    const g  = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`)

    // Title
    svg.append('text')
      .attr('x', W / 2).attr('y', 22)
      .attr('text-anchor', 'middle')
      .attr('fill', '#000000')
      .attr('font-size', 14).attr('font-weight', 600)
      .attr('font-family', 'sans-serif')
      .text(chart.title)

    const { chart_type, data, x_label, y_label } = chart

    // ── BAR CHART ──────────────────────────────────────────────────────
    if (chart_type === 'bar') {
      const x = d3.scaleBand().domain(data.map(d=>d.label)).range([0, iW]).padding(0.25)
      const y = d3.scaleLinear().domain([0, d3.max(data, d=>d.value) * 1.1]).nice().range([iH, 0])

      // Grid lines
      g.append('g').call(
        d3.axisLeft(y).tickSize(-iW).tickFormat('')
      ).call(g => g.select('.domain').remove())
        .call(g => g.selectAll('line').attr('stroke','#1e1e28').attr('stroke-dasharray','3,3'))

      // Bars
      g.selectAll('rect').data(data).enter().append('rect')
        .attr('x', d => x(d.label))
        .attr('y', d => y(d.value))
        .attr('width', x.bandwidth())
        .attr('height', d => iH - y(d.value))
        .attr('fill', (d,i) => CHART_COLORS[i % CHART_COLORS.length])
        .attr('rx', 4)
        .attr('opacity', 0.85)

      // Value labels on top
      g.selectAll('.val').data(data).enter().append('text')
        .attr('class','val')
        .attr('x', d => x(d.label) + x.bandwidth()/2)
        .attr('y', d => y(d.value) - 6)
        .attr('text-anchor','middle')
        .attr('fill','#7a7a99').attr('font-size',11).attr('font-family','monospace')
        .text(d => d.value % 1 === 0 ? d.value : d.value.toFixed(1))

      // X axis
      g.append('g').attr('transform',`translate(0,${iH})`).call(d3.axisBottom(x))
        .call(g => g.select('.domain').attr('stroke','#2a2a38'))
        .call(g => g.selectAll('line').attr('stroke','#2a2a38'))
        .selectAll('text')
        .attr('fill','#7a7a99').attr('font-size',11)
        .attr('transform','rotate(-25)').style('text-anchor','end')

      // Y axis
      g.append('g').call(d3.axisLeft(y).ticks(5))
        .call(g => g.select('.domain').attr('stroke','#2a2a38'))
        .call(g => g.selectAll('line').attr('stroke','#2a2a38'))
        .selectAll('text').attr('fill','#7a7a99').attr('font-size',11)

      // Axis labels
      if (x_label) svg.append('text').attr('x', margin.left + iW/2).attr('y', H - 8).attr('text-anchor','middle').attr('fill','#44445a').attr('font-size',11).attr('font-family','sans-serif').text(x_label)
      if (y_label) svg.append('text').attr('transform',`translate(14,${margin.top + iH/2}) rotate(-90)`).attr('text-anchor','middle').attr('fill','#44445a').attr('font-size',11).attr('font-family','sans-serif').text(y_label)
    }

    // ── LINE CHART ─────────────────────────────────────────────────────
    else if (chart_type === 'line') {
      const x = d3.scalePoint().domain(data.map(d=>d.label)).range([0, iW]).padding(0.3)
      const y = d3.scaleLinear().domain([0, d3.max(data, d=>d.value) * 1.1]).nice().range([iH, 0])

      // Grid lines
      g.append('g').call(d3.axisLeft(y).tickSize(-iW).tickFormat(''))
        .call(g => g.select('.domain').remove())
        .call(g => g.selectAll('line').attr('stroke','#1e1e28').attr('stroke-dasharray','3,3'))

      // Area fill
      const area = d3.area().x(d=>x(d.label)).y0(iH).y1(d=>y(d.value)).curve(d3.curveMonotoneX)
      g.append('path').datum(data).attr('fill','#6c63ff').attr('opacity',0.08).attr('d',area)

      // Line
      const line = d3.line().x(d=>x(d.label)).y(d=>y(d.value)).curve(d3.curveMonotoneX)
      g.append('path').datum(data).attr('fill','none').attr('stroke','#6c63ff').attr('stroke-width',2.5).attr('d',line)

      // Dots
      g.selectAll('circle').data(data).enter().append('circle')
        .attr('cx', d=>x(d.label)).attr('cy', d=>y(d.value))
        .attr('r', 5).attr('fill','#6c63ff').attr('stroke','#0f0f13').attr('stroke-width',2)

      // Value labels
      g.selectAll('.val').data(data).enter().append('text')
        .attr('class','val')
        .attr('x', d=>x(d.label)).attr('y', d=>y(d.value)-12)
        .attr('text-anchor','middle')
        .attr('fill','#7a7a99').attr('font-size',11).attr('font-family','monospace')
        .text(d => d.value % 1 === 0 ? d.value : d.value.toFixed(1))

      // X axis
      g.append('g').attr('transform',`translate(0,${iH})`).call(d3.axisBottom(x))
        .call(g => g.select('.domain').attr('stroke','#2a2a38'))
        .call(g => g.selectAll('line').attr('stroke','#2a2a38'))
        .selectAll('text').attr('fill','#7a7a99').attr('font-size',11)
        .attr('transform','rotate(-25)').style('text-anchor','end')

      // Y axis
      g.append('g').call(d3.axisLeft(y).ticks(5))
        .call(g => g.select('.domain').attr('stroke','#2a2a38'))
        .call(g => g.selectAll('line').attr('stroke','#2a2a38'))
        .selectAll('text').attr('fill','#7a7a99').attr('font-size',11)

      if (x_label) svg.append('text').attr('x', margin.left + iW/2).attr('y', H - 8).attr('text-anchor','middle').attr('fill','#44445a').attr('font-size',11).attr('font-family','sans-serif').text(x_label)
      if (y_label) svg.append('text').attr('transform',`translate(14,${margin.top + iH/2}) rotate(-90)`).attr('text-anchor','middle').attr('fill','#44445a').attr('font-size',11).attr('font-family','sans-serif').text(y_label)
    }

    // ── PIE CHART ──────────────────────────────────────────────────────
    else if (chart_type === 'pie') {
      const cx = iW / 2, cy = iH / 2
      const radius = Math.min(iW, iH) / 2 - 10

      const pie  = d3.pie().value(d=>d.value).sort(null)
      const arc  = d3.arc().innerRadius(radius * 0.45).outerRadius(radius)
      const arcs = pie(data)
      const total = d3.sum(data, d=>d.value)

      g.selectAll('path').data(arcs).enter().append('path')
        .attr('transform',`translate(${cx},${cy})`)
        .attr('d', arc)
        .attr('fill', (d,i) => CHART_COLORS[i % CHART_COLORS.length])
        .attr('stroke','#0f0f13').attr('stroke-width',2)
        .attr('opacity', 0.88)

      // Percentage labels inside slices
      g.selectAll('.pct').data(arcs).enter().append('text')
        .attr('class','pct')
        .attr('transform', d => `translate(${cx + arc.centroid(d)[0]},${cy + arc.centroid(d)[1]})`)
        .attr('text-anchor','middle').attr('dominant-baseline','central')
        .attr('fill','#fff').attr('font-size',11).attr('font-weight',600).attr('font-family','monospace')
        .text(d => `${Math.round(d.value/total*100)}%`)
    }
  }, [chart])

  return (
    <div style={S.canvas}>
      <svg style={{position:'absolute',inset:0,width:'100%',height:'100%',pointerEvents:'none'}}>
        <defs><pattern id="dots2" x="0" y="0" width="30" height="30" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" fill="#1e1e28"/></pattern></defs>
        <rect width="100%" height="100%" fill="url(#dots2)"/>
      </svg>
      <svg ref={svgRef} style={S.svgEl}/>
      {!chart && (
        <div style={S.empty}>
          <p style={{fontSize:14,color:'#44445a',marginTop:12}}>chart will appear here</p>
        </div>
      )}
      {chart && (
        <div style={{...S.hint, display:'flex', gap:8}}>
          <span style={{color: chart.chart_type==='bar'?'#0d00ff':'#000000', cursor:'default'}}>bar</span>
          <span style={{color:'#2a2a38'}}>·</span>
          <span style={{color: chart.chart_type==='line'?'#0d00ff':'#000000', cursor:'default'}}>line</span>
          <span style={{color:'#2a2a38'}}>·</span>
          <span style={{color: chart.chart_type==='pie'?'#0d00ff':'#000000', cursor:'default'}}>pie</span>
          <span style={{color:'#2a2a38'}}>·</span>
          <span>detected: <strong style={{color:'#0d00ff'}}>{chart.chart_type}</strong></span>
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════════════════
export default function App() {
  const [tab, setTab]     = useState('chart') // 'diagram' | 'chart'
  const [text, setText]   = useState('')
  const [caption, setCaption] = useState('')
  const [maxNodes, setMaxNodes] = useState(12)
  const [file, setFile]   = useState(null)
  const [dragOver, setDragOver] = useState(false)

  const [chart,   setChart]   = useState(null)
  const [jobId,   setJobId]   = useState(null)
  const [tokens,  setTokens]  = useState(0)
  const [loading, setLoading] = useState(false)
  const [status,  setStatus]  = useState(null)
  const [selNode, setSelNode] = useState(null)

  const fileRef = useRef(null)

  const readFile = f => {
    if (!f) return
    const r = new FileReader()
    r.onload = e => { setFile({name:f.name, content:e.target.result}); setText(e.target.result) }
    r.readAsText(f)
  }

  const generate = useCallback(async () => {
    if (!text.trim()) { setStatus({t:'error', msg:'Please enter some text first.'}); return }
    if (text.trim().split(/\s+/).length < 10) { setStatus({t:'error', msg:'Text too short. Add more detail.'}); return }

    setLoading(true)
    setStatus({t:'loading', msg:`Generating ${tab}…`})
    setSelNode(null)

    try {
      const endpoint = '/generate-chart'
      const body = { text: text.trim() }

      const res = await fetch(endpoint, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) })
      if (!res.ok) { const e = await res.json().catch(()=>({})); throw new Error(e.detail || `HTTP ${res.status}`) }

      const data = await res.json()
      setJobId(data.job_id)
      setTokens(data.tokens_used)

      setChart(data.chart)
      setStatus({t:'ok', msg:`${data.chart.chart_type} chart · ${data.chart.data.length} data points · ${data.tokens_used} tokens`})
      
    } catch(err) {
      setStatus({t:'error', msg:err.message})
    } finally {
      setLoading(false)
    }
  }, [text, caption, maxNodes, tab])

  const clearAll = () => {
    setText(''); setCaption(''); setDiagram(null); setChart(null)
    setJobId(null); setTokens(0); setStatus(null); setSelNode(null); setFile(null)
  }

  const loadExample = () => {
    setText('in the Computer Science class for Masters degree, there are 12 students, 1 from Indonesia, 1 from Russia, 1 from Japan, 3 from Africa, 1 from Slovakia, and the rest are from China')
    setCaption('')
    setFile(null)
  }

  return (
    <div style={S.app}>
      {/* Header */}
      <header style={S.header}>
        <div style={S.hTitle}>Testing Text<span style={S.hAccent}> to </span>Data Visualization</div>
        <div style={S.hMeta}>
          {jobId && <>
            <span style={S.pill}>job: {jobId}</span>
            {tab==='chart'   && chart   && <span style={S.pill}>{chart.chart_type} · {chart.data.length} pts</span>}
            <span style={S.pill}>{tokens.toLocaleString()} tokens</span>
          </>}
        </div>
      </header>

      <div style={S.body}>
        {/* Left Panel */}
        <aside style={S.panel}>

          {/* Tabs */}
          <div style={S.tabs}>
            <button style={{...S.tab(tab==='chart'),   borderRadius:'0 6px 6px 0', borderLeft:'none'}} onClick={()=>setTab('chart')}>Chart</button>
          </div>

          {/* Label + example */}
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
            <p style={{...S.slabel, marginBottom:0}}>{'TEXT WITH DATA'}</p>
            <button onClick={loadExample} style={{background:'none',border:'none',color:'#6c63ff',fontSize:11,cursor:'pointer',textDecoration:'underline',padding:0}}>load example</button>
          </div>

          {tab==='chart' && (
            <p style={{fontSize:11, color:'#7a7a99', lineHeight:1.6, marginTop:-6}}>
              Paste text containing numbers, percentages, or comparisons. The LLM will auto-detect bar, line, or pie chart.
            </p>
          )}

          {/* Textarea */}
          <textarea
            style={S.textarea}
            value={text}
            onChange={e=>setText(e.target.value)}
            onKeyDown={e=>{ if((e.ctrlKey||e.metaKey)&&e.key==='Enter') generate() }}
            placeholder={
              "Fill here"
            }
          />


          {/* Status */}
          {status && <div style={S.status(status.t)}>{status.t==='loading'?'':status.t==='error'?'✕ ':'✓ '}{status.msg}</div>}

          {/* Buttons */}
          <button style={S.btnPri(loading||!text.trim())} onClick={generate} disabled={loading||!text.trim()}>
            {loading ? 'Generating…' : 'Generate'}
          </button>
          <button style={S.btnSec} onClick={clearAll}>Clear</button>

        </aside>

        {/* Canvas area */}
        {
          <ChartCanvas chart={chart}/>
        }

        

        {/* chart summary */}
        {tab==='chart' && chart && (
          <aside style={S.infoPanel}>
            <div>
              <div style={{fontSize:13,fontWeight:600,color:'#000000',lineHeight:1.4}}>{chart.title}</div>
              {chart.source_summary && <div style={{fontSize:11,color:'#212121',lineHeight:1.6,marginTop:4}}>{chart.source_summary}</div>}
              <div style={{marginTop:8,display:'inline-block',padding:'3px 10px',background:'#6c63ff22',border:'1px solid #6c63ff44',borderRadius:20,fontSize:11,color:'#6c63ff'}}>{chart.chart_type} chart</div>
            </div>
            <div style={S.divider}/>
            <div>
              <p style={S.slabel}>DATA POINTS</p>
              {chart.data.map((d,i)=>(
                <div key={i} style={{display:'flex',alignItems:'center',gap:8,marginBottom:7}}>
                  <div style={{width:8,height:8,borderRadius:2,background:CHART_COLORS[i%CHART_COLORS.length],flexShrink:0}}/>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:11,color:'#000000',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{d.label}</div>
                  </div>
                  <div style={{fontSize:11,color:'#6c63ff',fontFamily:'monospace',fontWeight:600,flexShrink:0}}>{d.value%1===0?d.value:d.value.toFixed(1)}</div>
                </div>
              ))}
            </div>
          </aside>
        )}

      </div>
    </div>
  )
}
