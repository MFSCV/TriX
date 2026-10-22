// Owner token and drafts remain in page memory, never in localStorage or URLs.
const session = { token: '', projectId: '', projects: [], plan: null, taskId: '', doctor: null, busy: false, timer: null, revision: 0, update: null,
  draft: { prompt: '', input: '', operation: 'text.normalize', options: '{"trim":true,"case":"upper","newline":"lf"}' },
  message: 'Connect to the local runtime to inspect available capabilities.' };

export function runtimeWorkspaceHTML() {
  return `<div id="runtime-workspace"><div class="page-heading"><div><p class="eyebrow">AGENT WORKSPACE · LOCAL CONTROL PROFILE</p><h1>From intent to verified change.</h1><p>Inspect the plan, run a reviewed operation and verify the actual result before applying changes.</p></div><span class="badge purple" id="runtime-badge">DISCONNECTED</span></div><div id="runtime-message" class="runtime-status" role="status" aria-live="polite"></div>
  <div class="runtime-grid"><section class="card"><div class="card-head"><div><h2>1. Connect and choose the project</h2><p>Same-origin API · owner access token · explicitly authorized folder</p></div></div><div class="card-body"><form id="runtime-connect"><label for="runtime-token">Owner access token</label><div class="runtime-inline"><input id="runtime-token" type="password" autocomplete="off" placeholder="Token printed by trix serve"><button class="secondary" type="submit">Connect</button><button id="runtime-disconnect" class="ghost" type="button">Disconnect</button></div><small>The token stays in this tab's memory. Serve this workspace with <code>trix serve --workspace-root …</code>.</small></form><label for="runtime-project">Bound project</label><select id="runtime-project"><option value="">Choose a project</option></select><details><summary>Bind an authorized local folder</summary><form id="runtime-bind"><label for="runtime-project-id">Project ID</label><input id="runtime-project-id" maxlength="80" required placeholder="my-project"><label for="runtime-project-root">Absolute project folder</label><input id="runtime-project-root" required placeholder="Existing folder inside the server workspace root"><p class="footnote">Binding grants the local runtime access to this root within its configured workspace. Prompts and repository content cannot widen that boundary.</p><button class="secondary" type="submit">Bind this folder</button></form></details><details><summary>Runtime capability report</summary><pre id="runtime-doctor" class="runtime-code">Not connected.</pre></details></div></section>
  <section class="card"><div class="card-head"><div><h2>2. Describe the outcome</h2><p>A configured model proposes plans; typed CPU planning works offline.</p></div></div><div class="card-body"><label for="runtime-prompt">Goal for TriX</label><textarea id="runtime-prompt" rows="3" maxlength="6000" placeholder="Trim whitespace and normalize this text to uppercase with LF line endings."></textarea><label for="runtime-input">Operation input</label><textarea id="runtime-input" rows="4" maxlength="1048576" spellcheck="false" placeholder="Text or JSON data to transform"></textarea><div class="actions"><button id="runtime-chat" class="primary" type="button">Create plan from goal</button><button id="runtime-typed" class="secondary" type="button">Create typed plan</button></div><details><summary>Typed operation settings</summary><label for="runtime-operation">Reviewed CPU operation</label><select id="runtime-operation"><option value="text.normalize">Text normalization</option><option value="json.transform">JSON object transformation</option></select><label for="runtime-options">Operation options (JSON)</label><textarea id="runtime-options" rows="3" spellcheck="false"></textarea><small>Text: trim, case and newline. JSON: pick and sort_keys. Arbitrary code, project scripts and GPU support are not enabled by these operations.</small></details></div></section></div>
  <div class="runtime-grid"><section class="card"><div class="card-head"><div><h2>3. Review and run</h2><p>The plan is bound to exact input and project revision.</p></div></div><div class="card-body"><pre id="runtime-plan" class="runtime-code">No plan prepared.</pre><button id="runtime-run" class="primary" type="button" disabled>Run and build integration bundle</button><p class="footnote">Running computes the result and stages a reviewed integration bundle. Applying files is a separate explicit action.</p></div></section>
  <section class="card"><div class="card-head"><div><h2>4. Verify the actual result</h2><p>Durable tasks, recorded effects and attributable evidence</p></div></div><div class="card-body"><label for="runtime-task-id">Task ID</label><div class="runtime-inline"><input id="runtime-task-id" placeholder="Reattach to a task ID"><button id="runtime-watch" class="secondary" type="button">Inspect task</button></div><pre id="runtime-task" class="runtime-code">No task selected.</pre><div class="actions"><button id="runtime-refresh" class="secondary" type="button">Refresh</button><button id="runtime-cancel" class="secondary" type="button">Request cancellation</button><button id="runtime-resume" class="secondary" type="button">Resume eligible task</button></div><div class="runtime-effect-actions"><button id="runtime-apply" class="primary" type="button">Apply verified bundle to bound project</button><button id="runtime-verify" class="secondary" type="button">Verify installed files</button><button id="runtime-recover" class="secondary" type="button">Recover prior files</button></div><p class="footnote">Applying creates a linked task with its own effect records. Closing the page detaches observation; it does not cancel work or reverse files.</p><details open><summary>Verification evidence</summary><pre id="runtime-evidence" class="runtime-code">No evidence loaded.</pre></details><details><summary>Task event trail</summary><pre id="runtime-events" class="runtime-code">No events loaded.</pre></details><details><summary>Result and bundle</summary><pre id="runtime-artifact" class="runtime-code">No artifact loaded.</pre></details></div></section></div>
  <section class="card"><div class="card-body"><h2>One runtime across your workflow</h2><p>The CLI and this workspace share project, plan, task and authority contracts. IDE, ACP and MCP adapters use that same boundary. Configurator profiles remain planning proposals until independently qualified. Reviewed CPU transformations do not qualify arbitrary repository code or hardware backends.</p><div class="actions"><button class="secondary" data-go="commands">Offline deterministic commands</button><button class="secondary" data-go="configure">Environment configurator</button></div></div></section></div>`;
}

export function mountRuntimeWorkspace(root) {
  if (!root) return;
  if (session.timer) clearTimeout(session.timer);
  const $ = selector => root.querySelector(selector);
  const show = (selector, value) => { const node = $(selector); if (node) node.textContent = typeof value === 'string' ? value : JSON.stringify(value, null, 2); };
  const message = (value, error = false) => { session.message = value; show('#runtime-message', value); $('#runtime-message').classList.toggle('runtime-error', error); };
  const update = () => {
    $('#runtime-run').disabled = !session.plan || !session.token || session.busy;
    for (const name of ['chat', 'typed', 'apply', 'verify', 'recover', 'cancel', 'resume']) $(`#runtime-${name}`).disabled = !session.token || session.busy;
    show('#runtime-badge', session.token && session.doctor ? 'CONNECTED · LOCAL RUNTIME' : 'DISCONNECTED');
  };
  session.update = update;
  const request = async (route, method = 'GET', data) => {
    if (!session.token) throw new Error('Connect with an owner token first.');
    const response = await fetch(`/api/v1${route}`, { method, credentials: 'omit', headers: { Authorization: `Bearer ${session.token}`, ...(data === undefined ? {} : { 'Content-Type': 'application/json' }) }, ...(data === undefined ? {} : { body: JSON.stringify(data) }) });
    const result = await response.json().catch(() => { throw new Error('No valid runtime response. Serve this workspace with trix serve.'); });
    if (!response.ok || result.status === 'error') throw new Error(`${result.error?.code || response.status}: ${result.error?.message || 'Request failed.'}`);
    return result.data;
  };
  const action = async operation => {
    if (session.busy) return;
    session.busy = true; update();
    try { await operation(); } catch (error) { message(error.message, true); }
    finally { session.busy = false; update(); session.update?.(); }
  };
  const renderProjects = () => {
    const select = $('#runtime-project'); select.replaceChildren();
    const placeholder = document.createElement('option'); placeholder.value = ''; placeholder.textContent = 'Choose a project'; select.append(placeholder);
    for (const project of session.projects) { const option = document.createElement('option'); option.value = project.id || project.project_id; option.textContent = `${option.value} · ${project.root || ''}`; select.append(option); }
    select.value = session.projectId;
  };
  const selectProject = () => { const id = $('#runtime-project').value; if (!id) throw new Error('Select a bound project before planning.'); session.projectId = id; return id; };
  const selectTask = id => { session.taskId = id || ''; $('#runtime-task-id').value = session.taskId; };
  const refresh = async () => {
    if (!session.taskId) throw new Error('Choose a task ID first.');
    const id = encodeURIComponent(session.taskId), task = await request(`/tasks/${id}`);
    show('#runtime-task', task);
    for (const [endpoint, output] of [['events', '#runtime-events'], ['evidence', '#runtime-evidence'], ['artifact', '#runtime-artifact']]) {
      try { show(output, await request(`/tasks/${id}/${endpoint}`)); } catch (error) { show(output, error.message); }
    }
    if (!['SUCCEEDED', 'FAILED', 'CANCELLED'].includes(task.lifecycle || task.state) && root.isConnected) session.timer = setTimeout(() => { if (root.isConnected && session.token) action(refresh); }, 1200);
    return task;
  };
  $('#runtime-token').value = session.token;
  for (const [name, value] of Object.entries(session.draft)) $(`#runtime-${name}`).value = value;
  show('#runtime-plan', session.plan || 'No plan prepared.'); show('#runtime-doctor', session.doctor || 'Not connected.'); message(session.message); renderProjects(); update();
  if (session.taskId) { selectTask(session.taskId); action(refresh); }
  $('#runtime-connect').addEventListener('submit', event => { event.preventDefault(); action(async () => {
    session.token = $('#runtime-token').value.trim(); session.doctor = null;
    session.doctor = await request('/doctor'); show('#runtime-doctor', session.doctor);
    const projects = await request('/projects'); session.projects = Array.isArray(projects) ? projects : projects.projects || [];
    renderProjects(); message('Connected. Inspect capabilities and choose an explicitly bound project.');
  }); });
  $('#runtime-disconnect').addEventListener('click', () => { session.token = ''; session.doctor = null; $('#runtime-token').value = ''; if (session.timer) clearTimeout(session.timer); message('Disconnected. Existing tasks remain durable.'); update(); });
  $('#runtime-bind').addEventListener('submit', event => { event.preventDefault(); action(async () => {
    const id = $('#runtime-project-id').value.trim(); await request('/projects', 'POST', { id, root: $('#runtime-project-root').value });
    const projects = await request('/projects'); session.projects = Array.isArray(projects) ? projects : projects.projects || []; session.projectId = id; session.plan = null;
    renderProjects(); show('#runtime-plan', 'Project bound. Create a source-bound plan.'); message('Project bound within the server workspace boundary.');
  }); });
  const invalidate = () => { session.revision += 1; session.plan = null; show('#runtime-plan', 'Input or project changed. Create a new source-bound plan.'); update(); };
  $('#runtime-project').addEventListener('change', () => { session.projectId = $('#runtime-project').value; invalidate(); });
  for (const field of ['prompt', 'input', 'options']) $(`#runtime-${field}`).addEventListener('input', () => { session.draft[field] = $(`#runtime-${field}`).value; invalidate(); });
  $('#runtime-operation').addEventListener('change', () => { $('#runtime-options').value = $('#runtime-operation').value === 'json.transform' ? '{"pick":[],"sort_keys":true}' : '{"trim":true,"case":"upper","newline":"lf"}'; session.draft.operation = $('#runtime-operation').value; session.draft.options = $('#runtime-options').value; invalidate(); });
  const create = async natural => {
    session.plan = null; update(); const revision = session.revision;
    const common = { projectId: selectProject(), input: $('#runtime-input').value };
    const result = natural ? await request('/chat', 'POST', { ...common, prompt: $('#runtime-prompt').value }) : await request('/plans', 'POST', { ...common, operation: $('#runtime-operation').value, options: JSON.parse($('#runtime-options').value), goal: $('#runtime-prompt').value });
    if (revision !== session.revision) throw new Error('The draft changed while planning. Create a new plan before running.');
    session.plan = result.plan || result; show('#runtime-plan', session.plan); message('Plan prepared. Review exact input, operation, source revision and effects before running.');
  };
  $('#runtime-chat').addEventListener('click', () => action(() => create(true)));
  $('#runtime-typed').addEventListener('click', () => action(() => create(false)));
  $('#runtime-run').addEventListener('click', () => action(async () => {
    if (!session.plan) throw new Error('Prepare a plan first.');
    const task = await request('/tasks', 'POST', { projectId: selectProject(), plan: session.plan, apply: false, idempotencyKey: crypto.randomUUID() });
    selectTask(task.id || task.task_id); message('Task durably accepted. Acceptance is separate from verified completion.'); await refresh();
  }));
  $('#runtime-watch').addEventListener('click', () => action(async () => { selectTask($('#runtime-task-id').value.trim()); await refresh(); message('Task observation attached.'); }));
  $('#runtime-refresh').addEventListener('click', () => action(refresh));
  for (const name of ['cancel', 'resume', 'apply', 'verify', 'recover']) $(`#runtime-${name}`).addEventListener('click', () => action(async () => {
    if (!session.taskId) throw new Error('Choose a task first.');
    const result = await request(`/tasks/${encodeURIComponent(session.taskId)}/${name}`, 'POST', {});
    if (name === 'apply' && result?.id && result.id !== session.taskId) selectTask(result.id);
    message(`${name[0].toUpperCase() + name.slice(1)} request processed. Inspect actual state and evidence below.`); show('#runtime-task', result); await refresh();
  }));
}
