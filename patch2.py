with open('js/app.js', 'r', encoding='utf-8') as f:
    content = f.read()

idx = content.rfind('};')
new_funcs = '''
  addTypingIndicator() {
    const el = document.getElementById("chat-typing");
    const box = document.getElementById("chat-box");
    if (el && box) {
      el.style.display = 'flex';
      box.appendChild(el); // move to bottom
      box.scrollTop = box.scrollHeight;
    }
  },

  removeTypingIndicator() {
    const el = document.getElementById("chat-typing");
    if (el) el.style.display = 'none';
  }
'''

final_content = content[:idx] + ',' + new_funcs + content[idx:]

with open('js/app.js', 'w', encoding='utf-8') as f:
    f.write(final_content)
