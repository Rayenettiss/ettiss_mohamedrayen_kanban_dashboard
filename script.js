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