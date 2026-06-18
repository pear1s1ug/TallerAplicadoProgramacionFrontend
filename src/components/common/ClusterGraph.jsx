import { useEffect, useRef } from "react";

export default function ClusterGraph({ clusters = [], scores = [] }) {
    const containerRef = useRef(null);
    const sketchRef    = useRef(null);

    useEffect(() => {
        if (!clusters.length) return;

        const PALETA = [
            [59,  130, 246],
            [16,  185, 129],
            [139, 92,  246],
            [245, 158, 11],
            [236, 72,  153],
            [6,   182, 212],
            [239, 68,  68],
            [132, 204, 22],
        ];

        // mapa idAlumno -> cluster
        const clusterMap = {};
        clusters.forEach(({ idAlumno, cluster }) => {
            clusterMap[idAlumno] = cluster;
        });

        // agrupar alumnos por cluster
        const porCluster = {};
        clusters.forEach(({ idAlumno, cluster }) => {
            if (!porCluster[cluster]) porCluster[cluster] = [];
            porCluster[cluster].push(idAlumno);
        });

        // conectar cada alumno con el siguiente dentro de su cluster
        const aristas = [];
        Object.values(porCluster).forEach((miembros) => {
            if (miembros.length < 2) return;
            for (let i = 0; i < miembros.length - 1; i++) {
                aristas.push([miembros[i], miembros[i + 1]]);
            }
        });

        import("p5").then(({ default: p5 }) => {
            if (sketchRef.current) sketchRef.current.remove();

            const sketch = (p) => {
                const nodos = {};
                let dragging = null;

                p.setup = () => {
                    const w = containerRef.current.offsetWidth;
                    p.createCanvas(w, 480);
                    clusters.forEach(({ idAlumno }) => {
                        nodos[idAlumno] = {
                            x:  p.random(60, w - 60),
                            y:  p.random(60, 420),
                            vx: 0,
                            vy: 0,
                        };
                    });
                };

                p.draw = () => {
                    p.background(30, 30, 46);

                    const nodeIds = Object.keys(nodos).map(Number);

                    // repulsion entre todos los pares
                    for (let i = 0; i < nodeIds.length; i++) {
                        for (let j = i + 1; j < nodeIds.length; j++) {
                            const a = nodos[nodeIds[i]];
                            const b = nodos[nodeIds[j]];
                            const dx   = a.x - b.x;
                            const dy   = a.y - b.y;
                            const dist = Math.max(p.dist(a.x, a.y, b.x, b.y), 1);
                            const f    = 900 / (dist * dist);
                            a.vx += (dx / dist) * f;
                            a.vy += (dy / dist) * f;
                            b.vx -= (dx / dist) * f;
                            b.vy -= (dy / dist) * f;
                        }
                    }

                    // atraccion entre alumnos del mismo cluster
                    aristas.forEach(([idA, idB]) => {
                        const a = nodos[idA];
                        const b = nodos[idB];
                        if (!a || !b) return;
                        const dx   = b.x - a.x;
                        const dy   = b.y - a.y;
                        const dist = Math.max(p.dist(a.x, a.y, b.x, b.y), 1);
                        const f    = (dist - 80) * 0.03;
                        a.vx += (dx / dist) * f;
                        a.vy += (dy / dist) * f;
                        b.vx -= (dx / dist) * f;
                        b.vy -= (dy / dist) * f;
                    });

                    // friccion y actualizacion de posicion
                    nodeIds.forEach(id => {
                        if (dragging === id) return;
                        const n = nodos[id];
                        n.vx *= 0.85;
                        n.vy *= 0.85;
                        n.x  += n.vx;
                        n.y  += n.vy;
                        n.x   = p.constrain(n.x, 16, p.width  - 16);
                        n.y   = p.constrain(n.y, 16, p.height - 16);
                    });

                    // dibujar aristas
                    aristas.forEach(([idA, idB]) => {
                        const a = nodos[idA];
                        const b = nodos[idB];
                        if (!a || !b) return;
                        const cl        = clusterMap[idA];
                        const [r, g, b2] = PALETA[cl % PALETA.length];
                        p.stroke(r, g, b2, 60);
                        p.strokeWeight(1);
                        p.line(a.x, a.y, b.x, b.y);
                    });

                    // dibujar nodos
                    clusters.forEach(({ idAlumno, cluster }) => {
                        const n = nodos[idAlumno];
                        if (!n) return;
                        const [r, g, b] = PALETA[cluster % PALETA.length];
                        p.noStroke();
                        // halo
                        p.fill(r, g, b, 35);
                        p.circle(n.x, n.y, 22);
                        // nodo
                        p.fill(r, g, b);
                        p.circle(n.x, n.y, 10);
                    });

                    // tooltip al hacer hover
                    const nodeIds2 = Object.keys(nodos).map(Number);
                    const hover = nodeIds2.find(id => {
                        const n = nodos[id];
                        return p.dist(p.mouseX, p.mouseY, n.x, n.y) < 10;
                    });
                    if (hover !== undefined) {
                        const n         = nodos[hover];
                        const cl        = clusterMap[hover];
                        const [r, g, b] = PALETA[cl % PALETA.length];
                        p.fill(18, 18, 32, 220);
                        p.stroke(r, g, b);
                        p.strokeWeight(1);
                        p.rect(n.x + 12, n.y - 20, 114, 38, 6);
                        p.noStroke();
                        p.fill(255);
                        p.textSize(11);
                        p.text(`Alumno ${hover}`, n.x + 18, n.y - 5);
                        p.fill(r, g, b);
                        p.text(`Cluster ${cl}`, n.x + 18, n.y + 10);
                    }
                };

                // arrastrar nodos con el mouse
                p.mousePressed = () => {
                    const nodeIds = Object.keys(nodos).map(Number);
                    dragging = nodeIds.find(id =>
                        p.dist(p.mouseX, p.mouseY, nodos[id].x, nodos[id].y) < 10
                    ) ?? null;
                };

                p.mouseReleased = () => { dragging = null; };

                p.mouseDragged = () => {
                    if (dragging !== null && nodos[dragging]) {
                        nodos[dragging].x  = p.mouseX;
                        nodos[dragging].y  = p.mouseY;
                        nodos[dragging].vx = 0;
                        nodos[dragging].vy = 0;
                    }
                };
            };

            sketchRef.current = new p5(sketch, containerRef.current);
        });

        return () => { if (sketchRef.current) sketchRef.current.remove(); };
    }, [clusters, scores]);

    if (!clusters.length) return null;

    return (
        <div ref={containerRef} className="w-full rounded-xl overflow-hidden" />
    );
}