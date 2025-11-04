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
fetch('data/projects.json') 
  .then(r => {
    if (!r.ok) throw new Error('Failed to load projects.json');
    return r.json();
  })
  .then(projects => {
    const total = projects.length;
    const running = projects.filter(p => p.status === 'running').length;
    const completed = projects.filter(p => p.status === 'done').length; 
    const pending = projects.filter(p => p.status === 'pending').length;

    document.querySelector('.card1 h2').textContent = total;
    document.querySelector('.card3 h2').textContent = running;
    document.querySelector('.card2 h2').textContent = completed;
    document.querySelector('.card4 h2').textContent = pending;

    // b) Dynamically add SOME running projects to card7 (limit to 5 to keep neat, like picture 2 with 5 items)
    const card7 = document.querySelector('.card7');
    if (!card7) {
      console.warn('Card7 not found in the DOM');
      return;
    }
    // Filter running projects and limit to 5
    const runningProjects = projects.filter(p => p.status === 'running').slice(0, 5);

    // Handle empty case (UX: minimal message)
    if (runningProjects.length === 0) {
      const emptyMsg = document.createElement('p');
      emptyMsg.textContent = 'No running projects.';
      emptyMsg.style.padding = '1rem';
      emptyMsg.style.color = 'var(--clr-gray-dark)';
      emptyMsg.style.textAlign = 'center';
      card7.appendChild(emptyMsg);
      return;
    }


    // Function to generate random future due date 
    function getRandomDueDate() {
      const now = new Date(2025, 10, 4); // Current date: November 4, 2025
      const daysAhead = Math.floor(Math.random() * 60) + 1; // 1-60 days future
      const due = new Date(now.getTime() + daysAhead * 86400000);
      const monthName = due.toLocaleString('default', { month: 'short' });
      const day = due.getDate();
      const year = due.getFullYear();
      return `Due date: ${monthName} ${day}, ${year}`;
    }

    // Create custom 'project-item' for each 
    runningProjects.forEach(project => {
      const item = document.createElement('div');
      item.classList.add('project-item');

      // Project image as icon 
      const img = document.createElement('img');
      img.src = project.image;
      img.alt = `${project.name} image`;
      img.onerror = () => { img.src = 'assets/icons/project-management.png'; }; // Fallback to generic icon
      item.appendChild(img);

      // Text container 
      const txtDiv = document.createElement('div');
      const nameP = document.createElement('p');
      nameP.textContent = project.name;
      txtDiv.appendChild(nameP);

      const dueSpan = document.createElement('span');
      dueSpan.textContent = getRandomDueDate(); // Random due date as placeholder (no data in JSON)
        dueSpan.classList.add('due-date');
      txtDiv.appendChild(dueSpan);
      item.appendChild(txtDiv);
      card7.appendChild(item);
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
  .catch(err => console.error('Team load error:', err));


  //data tasks 

fetch('data/tasks.json') // Assuming same 'data/' folder
  .then(r => {
    if (!r.ok) throw new Error('Failed to load tasks.json');
    return r.json();
  })
  .then(tasks => {
    // Calculate counts for each status
    const toDoCount = tasks.filter(t => t.status === 'to do').length;
    const inProgressCount = tasks.filter(t => t.status === 'in progress').length;
    const doneCount = tasks.filter(t => t.status === 'done').length;
    const pendingCount = tasks.filter(t => t.status === 'pending').length;

    // Update counts in headers
    document.querySelector('.to-do .count').textContent = toDoCount;
    document.querySelector('.in-progress .count').textContent = inProgressCount;
    document.querySelector('.done .count').textContent = doneCount;
    document.querySelector('.pending .count').textContent = pendingCount;

    // Function to get deadline text and class
    function getDeadlineInfo(dueDateStr) {
      const now = new Date();
      const due = new Date(dueDateStr);
      const diffMs = due - now;
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24)); // Days left

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
