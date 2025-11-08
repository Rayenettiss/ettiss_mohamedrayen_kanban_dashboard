document.addEventListener('DOMContentLoaded', () => {
    const dashboard = document.querySelector('#dashboard');
    const tasks = document.querySelector('#tasks');

    if (!dashboard || !tasks) {
        console.error('Selectors not found: #dashboard or #tasks missing?');
        return;
    }

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.remove('hidden');
                entry.target.classList.add('visible');
            } else {
                entry.target.classList.remove('visible');
                entry.target.classList.add('hidden');
            }
        });
    }, { threshold: 0.1 });

    observer.observe(tasks);
    // You can observe dashboard too if you want it to hide when out of view, but since it's initial, maybe not needed
    // observer.observe(dashboard);

    // Active class and smooth scroll handling
    const navLinks = document.querySelectorAll('.nav-links li a');
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = e.currentTarget.getAttribute('href').substring(1);
            const target = document.getElementById(targetId);
            if (target) {
                target.scrollIntoView({ behavior: 'smooth' });
            }
            // Remove active from all
            document.querySelectorAll('.nav-links li').forEach(li => li.classList.remove('active'));
            // Add active to parent li
            e.currentTarget.parentElement.classList.add('active');
        });
    });
});

//data projects 
/* --------------------------------------------------------------
   PROJECTS + GAUGE CHART 
   -------------------------------------------------------------- */
fetch('data/projects.json')
  .then(r => {
    if (!r.ok) throw new Error('Failed to load projects.json');
    return r.json();
  })
  .then(projects => {
    /* ---------- 1. Stats for the cards ---------- */
    const total     = projects.length;
    const completed = projects.filter(p => p.status === 'done').length;
    const running   = projects.filter(p => p.status === 'running').length;
    const pending   = projects.filter(p => p.status === 'pending').length;

    // update the four little cards
    document.querySelector('.card1 h2')?.replaceChildren(total);
    document.querySelector('.card2 h2')?.replaceChildren(completed);
    document.querySelector('.card3 h2')?.replaceChildren(running);
    document.querySelector('.card4 h2')?.replaceChildren(pending);

    /* ---------- 2. Fill card7 (running projects) ---------- */
    const card7 = document.querySelector('.card7');
    if (card7) {
      const running5 = projects.filter(p => p.status === 'running').slice(0, 7);
      if (running5.length === 0) {
        const p = document.createElement('p');
        p.textContent = 'No running projects.';
        p.style.cssText = 'padding:1rem;color:var(--clr-gray-dark);text-align:center;';
        card7.appendChild(p);
      } else {
        const randomDue = () => {
          const base = new Date(2025, 10, 4);               // 4 Nov 2025
          const days = Math.floor(Math.random() * 60) + 1; // 1-60 days ahead
          const d = new Date(base.getTime() + days * 86400000);
          return `Due date: ${d.toLocaleDateString('en-US', {
            month: 'short',
            day:   'numeric',
            year:  'numeric'
          })}`;
        };

        running5.forEach(p => {
          const item = document.createElement('div');
          item.className = 'project-item';

          const img = document.createElement('img');
          img.src = p.image;
          img.alt = p.name;
          img.onerror = () => img.src = 'assets/icons/project-management.png';
          item.appendChild(img);

          const txt = document.createElement('div');
          const name = document.createElement('p');
          name.textContent = p.name;
          txt.appendChild(name);

          const due = document.createElement('span');
          due.className = 'due-date';
          due.textContent = randomDue();
          txt.appendChild(due);

          item.appendChild(txt);
          card7.appendChild(item);
        });
      }
    }

    /* ---------- 3. GAUGE CHART ---------- */
  const canvas = document.getElementById('progressChart');
  if (!canvas) {
    console.warn('progressChart canvas missing – skipping gauge');
    return;
  }
  const ctx = canvas.getContext('2d');

  /* ---- stripe pattern (pending section) ---- */
  const stripeSize = 10;
  const stripe = document.createElement('canvas');
  stripe.width = stripe.height = stripeSize;
  const s = stripe.getContext('2d');
  s.fillStyle = '#f5f5f5';
  s.fillRect(0, 0, stripeSize, stripeSize);
  s.strokeStyle = '#023E7D';
  s.lineWidth = 1.2;
  s.beginPath();
  s.moveTo(-stripeSize, 0);
  s.lineTo(stripeSize, stripeSize * 2);
  s.moveTo(0, 0);
  s.lineTo(stripeSize * 2, stripeSize * 2);
  s.moveTo(stripeSize, 0);
  s.lineTo(stripeSize * 3, stripeSize * 2);
  s.stroke();
  const pattern = ctx.createPattern(stripe, 'repeat');

  /* ---- gauge geometry ---- */
  const cx = 200, cy = 200, outerRadius = 150, innerRadius = 100;
  const startAngle = Math.PI, totalAngle = Math.PI;

  /* ---- percentages (safe divide) ---- */
  const safe = total || 1;
  const pctDone = completed / safe;
  const pctRun  = running   / safe;
  const pctPend = 1 - pctDone - pctRun;
  const finalPct = Math.round(pctDone * 100);   // 0-100

  const sections = [
    { pct: pctDone, color: '#00334E', striped: false, label: 'Completed', percent: Math.round(pctDone * 100) },
    { pct: pctRun,  color: '#5588A3', striped: false, label: 'In Progress', percent: Math.round(pctRun * 100) },
    { pct: pctPend, color: null,      striped: true,  label: 'Pending',    percent: Math.round(pctPend * 100) }
  ];

  /* ---- animation state ---- */
  let prog = 0, shown = 0, labelAlpha = 0;
  const dur = 2000;
  let startTime = null;
  let hoveredSection = null;
  let tooltipOpacity = 0;

  const ease = t => 1 - Math.pow(1 - t, 4);   // easeOutQuart

  function draw(timestamp) {
    if (!startTime) startTime = timestamp;
    const elapsed = timestamp - startTime;
    prog = Math.min(elapsed / dur, 1);
    const easeProg = ease(prog);

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    let currentAngle = startAngle;
    let accumulated = 0;

    sections.forEach((section, index) => {
      const sectionStart = accumulated;
      const sectionEnd   = accumulated + section.pct;
      accumulated = sectionEnd;

      const drawUpTo = Math.min(easeProg, sectionEnd) - sectionStart;
      if (drawUpTo <= 0) return;

      const delta    = drawUpTo * totalAngle;
      const endAngle = currentAngle + delta;

      ctx.beginPath();
      ctx.arc(cx, cy, outerRadius, currentAngle, endAngle);
      const ox = cx + outerRadius * Math.cos(endAngle);
      const oy = cy + outerRadius * Math.sin(endAngle);
      ctx.lineTo(ox, oy);
      ctx.lineTo(cx + innerRadius * Math.cos(endAngle), cy + innerRadius * Math.sin(endAngle));
      ctx.arc(cx, cy, innerRadius, endAngle, currentAngle, true);
      ctx.closePath();

      ctx.fillStyle = section.striped ? pattern : section.color;
      ctx.fill();

      /* ---- highlight when hovered ---- */
      if (index === hoveredSection && prog > 0.1) {
        ctx.save();
        ctx.globalAlpha = 0.25;
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.restore();
      }

      currentAngle = endAngle;
    });

    /* ---- central % ---- */
    shown = Math.floor(easeProg * finalPct);
    ctx.font = 'bold 48px Arial';
    ctx.fillStyle = '#000';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${shown}%`, cx, cy - 5);

    /* ---- “Project Ended” label ---- */
    labelAlpha = easeProg > 0.7 ? Math.min((easeProg - 0.7) / 0.3, 1) : 0;
    ctx.font = '18px Arial';
    ctx.globalAlpha = labelAlpha;
    ctx.fillText('Project Ended', cx, cy + 35);
    ctx.globalAlpha = 1;

    /* ---- tooltip (inside the ring) ---- */
    if (hoveredSection !== null && tooltipOpacity > 0) {
      const sec = sections[hoveredSection];
      const txt = `${sec.label}: ${sec.percent}%`;

      ctx.font = 'bold 16px Arial';
      const w = ctx.measureText(txt).width + 20;
      const h = 30;
      const x = cx - w / 2;
      const y = cy - outerRadius - h - 12;   // just above the outer arc

      roundRect(ctx, x, y, w, h, 10);
      ctx.fillStyle = 'rgba(0,0,0,0.85)';
      ctx.fill();

      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(txt, cx, y + h / 2);
    }

    if (prog < 1) requestAnimationFrame(draw);
  }

  /* ---------- HOVER LOGIC (fixed – no inversion) ---------- */
  canvas.addEventListener('mousemove', e => {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left - cx;
    const my = e.clientY - rect.top  - cy;
    const dist = Math.hypot(mx, my);

    // ignore everything outside the ring
    if (dist < innerRadius || dist > outerRadius || my > 0) {
      if (hoveredSection !== null) {
        hoveredSection = null;
        tooltipOpacity = 0;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        requestAnimationFrame(() => draw(performance.now()));
      }
      return;
    }

    // ----- angle calculation (clockwise from top-left) -----
    // atan2 returns angle from positive X-axis (-PI … PI)
    let angle = Math.atan2(my, mx);           // -PI … PI
    if (angle < 0) angle += 2 * Math.PI;      // 0 … 2PI

    // startAngle = PI (left side).  Gauge runs clockwise → we need to
    // map the angle to the gauge's 0-PI range.
    const gaugeZero = Math.PI;                // left side
    let rel = angle - gaugeZero;              // -PI … PI
    if (rel < 0) rel += 2 * Math.PI;          // 0 … 2PI

    // The gauge occupies only the upper half (PI radians)
    if (rel > Math.PI) rel = 0;               // safety

    // ----- find which section the angle belongs to -----
    let acc = 0, found = null;
    sections.forEach((s, i) => {
      const secAngle = s.pct * totalAngle;    // totalAngle = PI
      if (rel >= acc && rel < acc + secAngle) found = i;
      acc += secAngle;
    });

    if (found !== hoveredSection) {
      hoveredSection = found;
      tooltipOpacity = 1;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      requestAnimationFrame(() => draw(performance.now()));
    }
  });

  canvas.addEventListener('mouseleave', () => {
    if (hoveredSection !== null) {
      hoveredSection = null;
      tooltipOpacity = 0;
      requestAnimationFrame(() => draw(performance.now()));
    }
  });

  /* ---- start animation ---- */
  window.addEventListener('load', () => {
    setTimeout(() => requestAnimationFrame(draw), 700);
  });
    })
    .catch(err => console.error('Projects load error:', err));


// data teams

fetch('data/team.json')
  .then(r => {
    if (!r.ok) throw new Error('Failed to load team.json');
    return r.json();
  })
  .then(teams => {
    const card8 = document.querySelector('.card8');
    if (!card8) {
      console.warn('Card8 not found in the DOM');
      return;
    }
    // Take only first 5 team members
    const displayedMembers = teams.slice(0, 5);

    if (displayedMembers.length === 0) {
      const emptyMsg = document.createElement('p');
      emptyMsg.textContent = 'No team members.';
      emptyMsg.style.padding = '1rem';
      emptyMsg.style.color = 'var(--clr-gray-dark)';
      emptyMsg.style.textAlign = 'center';
      card8.appendChild(emptyMsg);
      return;
    }
    displayedMembers.forEach(member => {
      const item = document.createElement('div');
      item.classList.add('team-item');

      // Image 
      const img = document.createElement('img');
      img.src = member.image;
      img.alt = member.full_name;
      img.onerror = () => { img.src = 'assets/icons/user-avatar.png'; };
      item.appendChild(img);

      // Text
      const txtDiv = document.createElement('div');

      const nameP = document.createElement('p');
      nameP.textContent = member.full_name;

      txtDiv.appendChild(nameP);

      const jobSpan = document.createElement('span');
      jobSpan.textContent = member.job;
      jobSpan.classList.add('job-title');
      txtDiv.appendChild(jobSpan);

      item.appendChild(txtDiv);
      card8.appendChild(item);
    });
  })
  .catch(err => console.error('Teams load error:', err));

// tasks data
fetch('data/tasks.json')
  .then(r => {
    if (!r.ok) throw new Error('Failed to load tasks.json');
    return r.json();
  })
  .then(tasks => {
    // Update task counts
    const toDoCount = tasks.filter(t => t.status === 'to do').length;
    const inProgressCount = tasks.filter(t => t.status === 'in progress').length;
    const doneCount = tasks.filter(t => t.status === 'done').length;
    const pendingCount = tasks.filter(t => t.status === 'pending').length;

    document.querySelector('.to-do .count').textContent = toDoCount;
    document.querySelector('.in-progress .count').textContent = inProgressCount;
    document.querySelector('.done .count').textContent = doneCount;
    document.querySelector('.pending .count').textContent = pendingCount;

    // Function to calculate deadline info
    function getDeadlineInfo(dueDateStr) {
      const currentDate = new Date(); // Use current date
      const dueDate = new Date(dueDateStr);
      const diffTime = dueDate - currentDate;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      let text = '';
      let className = '';

      if (diffDays < 0) {
        text = `Overdue ${Math.abs(diffDays)} days`;
        className = 'overdue'; // Red
      } else if (diffDays === 0) {
        text = 'Today';
        className = 'today'; // Default or green (add CSS)
      } else if (diffDays <= 3) {
        text = `In ${diffDays} days`;
        className = 'urgent'; // Orange
      } else {
        text = `In ${diffDays} days`;
        className = ''; // Default
      }

      return { text, className };
    }

    // Function to format due date like "Nov 10, 2025"
    function formatDueDate(dueDateStr) {
      const due = new Date(dueDateStr);
      const monthName = due.toLocaleString('default', { month: 'short' });
      const day = due.getDate();
      const year = due.getFullYear();
      return `${monthName} ${day}, ${year}`;
    }

    // Helper to populate a column with limited tasks (5 max per column)
    function populateColumn(selector, status) {
      const column = document.querySelector(selector);
      if (!column) return;

      // Filter tasks
      const filteredTasks = tasks.filter(t => t.status === status);

      // Handle empty
      if (filteredTasks.length === 0) {
        const emptyMsg = document.createElement('p');
        emptyMsg.textContent = 'No tasks.';
        emptyMsg.style.padding = '1rem';
        emptyMsg.style.color = 'var(--clr-gray-dark)';
        emptyMsg.style.textAlign = 'center';
        column.appendChild(emptyMsg);
        return;
      }
      // Determine if due date should be shown (disabled for 'done' and 'pending')
      const showDueDate = !(status === 'done' || status === 'pending');
      // Add tasks
      filteredTasks.forEach(task => {
        const taskDiv = document.createElement('div');
        taskDiv.classList.add('task');

        const nameH4 = document.createElement('h4');
        nameH4.textContent = task.name;
        taskDiv.appendChild(nameH4);

        const descP = document.createElement('p');
        descP.textContent = task.description;
        taskDiv.appendChild(descP);

        const detailsDiv = document.createElement('div');
        detailsDiv.classList.add('details');

        const dueSpan = document.createElement('span');
        dueSpan.classList.add('due-date');
        dueSpan.textContent = `${formatDueDate(task.due_date)}`;
        detailsDiv.appendChild(dueSpan);
        if (showDueDate) {
        const deadlineInfo = getDeadlineInfo(task.due_date);
        const deadlineSpan = document.createElement('span');
        deadlineSpan.classList.add('deadline');
        if (deadlineInfo.className) {
          deadlineSpan.classList.add(deadlineInfo.className);
        }
        deadlineSpan.textContent = deadlineInfo.text;
        detailsDiv.appendChild(deadlineSpan);
    }

        taskDiv.appendChild(detailsDiv);
        column.appendChild(taskDiv);
      });
    }

    // Populate each column
    populateColumn('.to-do', 'to do');
    populateColumn('.in-progress', 'in progress');
    populateColumn('.done', 'done');
    populateColumn('.pending', 'pending');
  })
  .catch(err => console.error('Tasks load error:', err));

  //time tracker
document.addEventListener('DOMContentLoaded', () => {
  // Time Tracker Functionality
  const timeDisplay = document.querySelector('.card10 h2');
  const playBtn = document.querySelector('.card10 img[src="assets/icons/play.png"]');
  const pauseBtn = document.querySelector('.card10 img[src="assets/icons/pause.png"]');
  const stopBtn = document.querySelector('.card10 img[src="assets/icons/stop.svg"]');

  let timerInterval = null;
  let currentTime = 0; // in seconds

  // Function to format time as HH:MM:SS
  function formatTime(seconds) {
    const hrs = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const mins = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${hrs}:${mins}:${secs}`;
  }

  // Update display
  function updateDisplay() {
    timeDisplay.textContent = formatTime(currentTime);
  }

  // Show/hide buttons based on state
  function updateButtonVisibility(isRunning, isPaused) {
    if (currentTime === 0) {
      // Initial stopped state
      playBtn.style.display = 'inline-block';
      pauseBtn.style.display = 'none';
      stopBtn.style.display = 'none';
    } else if (isRunning) {
      // Running: show pause and stop, hide play
      playBtn.style.display = 'none';
      pauseBtn.style.display = 'inline-block';
      stopBtn.style.display = 'inline-block';
    } else if (isPaused) {
      // Paused: show play and stop, hide pause
      playBtn.style.display = 'inline-block';
      pauseBtn.style.display = 'none';
      stopBtn.style.display = 'inline-block';
    }
  }

  // Start timer
  function startTimer() {
    if (timerInterval) return; // Already running
    timerInterval = setInterval(() => {
      currentTime++;
      updateDisplay();
      updateButtonVisibility(true, false);
    }, 1000);
    
  }
  // Pause timer
  function pauseTimer() {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
    updateButtonVisibility(false, true);
  }

  // Stop and save timer
  function stopTimer() {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
    // Save the time (e.g., console.log or send to server; here we just log)
    console.log(`Time tracked: ${formatTime(currentTime)}`);
    // Optionally, alert the user
    alert(`Time saved: ${formatTime(currentTime)}`);
    // Reset
    currentTime = 0;
    updateDisplay();
    updateButtonVisibility(false, false);
  }

  // Event listeners
  if (playBtn && pauseBtn && stopBtn && timeDisplay) {
    playBtn.addEventListener('click', startTimer);
    pauseBtn.addEventListener('click', pauseTimer);
    stopBtn.addEventListener('click', stopTimer);

    // Initial setup
    updateDisplay();
    updateButtonVisibility(false, false); // Initial stopped state
  } else {
    console.log('Time tracker elements not found.');
  }
});

// Helper: rounded rectangle (used in charts)
function roundRect(ctx, x, y, w, h, r) {
  if (w < 2 * r) r = w / 2;
  if (h < 2 * r) r = h / 2;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// ==== ANIMATED + HOVER Project Analytics Bar Chart ====
document.addEventListener('DOMContentLoaded', () => {
  const analyticsCanvas = document.getElementById('analyticsChart');
  if (!analyticsCanvas) {
    console.warn('analyticsChart canvas missing – skipping bar chart');
    return;
  }
  const actx = analyticsCanvas.getContext('2d');

  const stripeSize = 10;
  const stripeCanvas = document.createElement('canvas');
  stripeCanvas.width = stripeSize;
  stripeCanvas.height = stripeSize;
  const sctx = stripeCanvas.getContext('2d');
  sctx.fillStyle = '#f5f5f5';
  sctx.fillRect(0, 0, stripeSize, stripeSize);
  sctx.strokeStyle = '#023E7D';
  sctx.lineWidth = 1.2;
  sctx.beginPath();
  sctx.moveTo(-stripeSize, 0);
  sctx.lineTo(stripeSize, stripeSize * 2);
  sctx.moveTo(0, 0);
  sctx.lineTo(stripeSize * 2, stripeSize * 2);
  sctx.moveTo(stripeSize, 0);
  sctx.lineTo(stripeSize * 3, stripeSize * 2);
  sctx.stroke();

  const stripePatternA = actx.createPattern(stripeCanvas, 'repeat');

  const barWidth = 35;
  const gap = 20;
  const totalBarsWidth = 7 * barWidth + 6 * gap;
  const startBarX = (400 - totalBarsWidth) / 2;
  const baselineY = 250;
  const maxHeight = 180;

  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  const bars = [
    { finalHeight: 50,  striped: true,  percent: 28, day: days[0] },
    { finalHeight: 110, color: '#145374', percent: 61, day: days[1] },
    { finalHeight: 150, color: '#34617F', percent: 83, day: days[2] },
    { finalHeight: 180, color: '#00334E', percent: 100, day: days[3] },
    { finalHeight: 115, striped: true,  percent: 64, day: days[4] },
    { finalHeight: 70,  striped: true,  percent: 39, day: days[5] },
    { finalHeight: 50,  striped: true,  percent: 28, day: days[6] }
  ];

  let barProgress = 0;
  let barStartTime = null;
  const barDuration = 1800;
  let hoveredBarIndex = -1;

  analyticsCanvas.addEventListener('mousemove', (e) => {
    const rect = analyticsCanvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    let found = -1;

    bars.forEach((bar, i) => {
      const currentX = startBarX + (barWidth + gap) * i;
      if (mouseX >= currentX && mouseX <= currentX + barWidth) {
        found = i;
      }
    });

    if (found !== hoveredBarIndex) {
      hoveredBarIndex = found;
      drawBars();
    }
  });

  analyticsCanvas.addEventListener('mouseleave', () => {
    if (hoveredBarIndex !== -1) {
      hoveredBarIndex = -1;
      drawBars();
    }
  });

  function drawBars() {
    actx.clearRect(0, 0, analyticsCanvas.width, analyticsCanvas.height);

    bars.forEach((bar, i) => {
      const currentX = startBarX + (barWidth + gap) * i;
      const currentHeight = bar.finalHeight * barProgress;
      const barY = baselineY - currentHeight;
      const radius = barWidth / 2;

      roundRect(actx, currentX, barY, barWidth, currentHeight, radius);
      actx.fillStyle = bar.striped ? stripePatternA : bar.color;
      actx.fill();

      if (hoveredBarIndex === i && barProgress > 0.1) {
        const line1 = bar.day;
        const line2 = bar.percent + '%';

        actx.font = 'bold 14px Arial';
        const width1 = actx.measureText(line1).width;
        const width2 = actx.measureText(line2).width;
        const textWidth = Math.max(width1, width2);
        const padding = 12;
        const lineHeight = 18;
        const bubbleHeight = 48;
        const bubbleY = barY - 58;
        const bubbleX = currentX + barWidth / 2 - (textWidth + 2 * padding) / 2;

        roundRect(actx, bubbleX, bubbleY, textWidth + 2 * padding, bubbleHeight, 14);
        actx.fillStyle = '#fff';
        actx.fill();
        actx.strokeStyle = '#ccc';
        actx.lineWidth = 1;
        actx.stroke();

        actx.fillStyle = '#000';
        actx.textAlign = 'center';
        actx.textBaseline = 'middle';
        actx.fillText(line1, currentX + barWidth / 2, bubbleY + lineHeight);
        actx.font = 'bold 16px Arial';
        actx.fillText(line2, currentX + barWidth / 2, bubbleY + bubbleHeight - 16);

        const pointerY = barY - 2;
        actx.beginPath();
        actx.moveTo(currentX + barWidth / 2, bubbleY + bubbleHeight);
        actx.lineTo(currentX + barWidth / 2 - 7, pointerY);
        actx.lineTo(currentX + barWidth / 2 + 7, pointerY);
        actx.closePath();
        actx.fillStyle = '#fff';
        actx.fill();
        actx.stroke();
      }

      actx.fillStyle = '#000';
      actx.font = '16px Arial';
      actx.textAlign = 'center';
      actx.textBaseline = 'top';
      actx.fillText(dayLabels[i], currentX + barWidth / 2, baselineY + 10);
    });
  }

  function animateBars(timestamp) {
    if (!barStartTime) barStartTime = timestamp;
    const elapsed = timestamp - barStartTime;
    barProgress = Math.min(elapsed / barDuration, 1);
    const ease = easeOutQuart(barProgress);
    drawBars();

    if (barProgress < 1) {
      requestAnimationFrame(animateBars);
    }
  }

  function easeOutQuart(t) {
    return 1 - Math.pow(1 - t, 4);
  }

  // Start bar chart animation after a delay
  window.addEventListener('load', () => {
    setTimeout(() => requestAnimationFrame(animateBars), 1100);
  });
});