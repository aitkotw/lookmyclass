function changeGreeting() {
  const greeting = document.getElementById('greeting');
  const btn = document.getElementById('btn');

  greeting.textContent = 'Hello from GitHub Pages';
  greeting.style.color = '#4a90e2';
  btn.textContent = 'Changed!';
  btn.disabled = true;
  btn.style.background = '#a0aec0';
}
