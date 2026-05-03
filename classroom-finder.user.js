// ==UserScript==
// @name         28号楼空闲教室查询助手
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  在天津理工大学教务系统“空闲教室查询”页面自动提取数据并在弹窗中进行高级条件筛选
// @author       WIKEX
// @match        *://*/*
// @grant        window.onurlchange
// ==/UserScript==

(function() {
    'use strict';

    // ==========================================
    // 1. 悬浮按钮与主UI挂载点
    // ==========================================
    const floatBtn = document.createElement('div');
    floatBtn.innerHTML = '🏫 查空教室';
    Object.assign(floatBtn.style, {
        position: 'fixed',
        right: '20px',
        bottom: '80px',
        padding: '12px 20px',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        borderRadius: '30px',
        boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
        cursor: 'pointer',
        zIndex: '999998',
        fontFamily: 'sans-serif',
        fontWeight: 'bold',
        fontSize: '14px',
        transition: 'transform 0.2s',
        display: 'block' // 始终显示
    });

    floatBtn.onmouseover = () => floatBtn.style.transform = 'translateY(-2px)';
    floatBtn.onmouseout = () => floatBtn.style.transform = 'none';
    
    // 确保 body 存在后再挂载，防止有些框架还没生成 body 就执行了脚本
    const mountBtn = () => {
        if (document.body) {
            document.body.appendChild(floatBtn);
        } else {
            setTimeout(mountBtn, 500);
        }
    };
    mountBtn();

    // ==========================================
    // 2. 注入界面的 Shadow DOM 和 UI 代码
    // ==========================================
    const host = document.createElement('div');
    const mountHost = () => {
        if (document.body) {
            document.body.appendChild(host);
        } else {
            setTimeout(mountHost, 500);
        }
    };
    mountHost();
    const shadow = host.attachShadow({ mode: 'open' });

    const styles = `
        * { margin: 0; padding: 0; box-sizing: border-box; }
        :host {
            all: initial;
            display: none;
            position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
            background: rgba(0,0,0,0.6);
            z-index: 999999;
            justify-content: center; align-items: center;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
            backdrop-filter: blur(2px);
        }
        :host(.show) { display: flex; }
        .container {
            width: 90%; max-width: 900px; max-height: 90vh; overflow-y: auto;
            background: white; border-radius: 12px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            padding: 40px; position: relative;
        }
        .close-btn {
            position: absolute; top: 20px; right: 20px; cursor: pointer;
            font-size: 24px; color: #999; background: none; border: none;
            width: 40px; height: 40px; border-radius: 20px;
        }
        .close-btn:hover { background: #f0f0f0; color: #333; }
        .header { text-align: center; margin-bottom: 30px; }
        .header h1 { color: #333; font-size: 24px; margin-bottom: 8px; font-weight:bold; }
        .header p { color: #666; font-size: 14px; }
        .input-section { display: flex; gap: 12px; margin-bottom: 20px; flex-wrap: wrap; align-items: flex-end; }
        .input-group { display: flex; flex-direction: column; gap: 8px; }
        .input-group label { font-size: 14px; font-weight: 500; color: #333; }
        .time-slots { display: flex; gap: 8px; flex-wrap: wrap; }
        .time-slot { width: 50px; padding: 8px; border: 2px solid #e0e0e0; border-radius: 8px; text-align: center; cursor: pointer; transition: all 0.3s; font-size: 14px; font-weight: 500; background:white;}
        .time-slot:hover { border-color: #667eea; background-color: #f5f5f5; }
        .time-slot.selected { background-color: #667eea; color: white; border-color: #667eea; }
        .btn { padding: 10px 24px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 600; transition: transform 0.2s; }
        .btn:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4); }
        .results-section { margin-top: 24px; }
        .results-title { display: flex; justify-content: space-between; align-items: center; padding-bottom: 12px; border-bottom: 2px solid #e0e0e0; margin-bottom: 16px; }
        .results-title h2 { font-size: 16px; color: #333; font-weight: bold;}
        .results-count { background: #667eea; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; }
        .results-table { width: 100%; border-collapse: collapse; }
        .results-table thead { background-color: #f5f5f5; }
        .results-table th, .results-table td { padding: 12px; text-align: left; border-bottom: 1px solid #e0e0e0; }
        .results-table th { font-weight: 600; color: #333; font-size: 14px; }
        .results-table td { font-size: 14px; color: #666; }
        .room-name { font-weight: 600; color: #333; }
        .time-slots-result { color: #667eea; font-weight: 600; }
        .no-results { text-align: center; padding: 40px 20px; color: #999; font-size: 14px; }
        .error-message { color: #e74c3c; padding: 12px; background-color: #fdeaea; border-radius: 8px; margin-bottom: 20px; font-size: 14px; }
        .success-message { color: #27ae60; padding: 12px; background-color: #eafaf1; border-radius: 8px; margin-bottom: 20px; font-size: 14px; }
        .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 16px; margin-bottom: 24px; }
        .stat-card { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; text-align: center; }
        .stat-card .label { font-size: 12px; opacity: 0.9; margin-bottom: 8px; }
        .stat-card .value { font-size: 24px; font-weight: 600; }
        .time-slot-visual { display: flex; gap: 4px; align-items: center; }
        .block { width: 20px; height: 20px; border-radius: 3px; display: inline-block; }
        .block.has-course { background-color: #ff9800; }
        .block.no-course { background-color: #ccc; }
        .status-panel { padding: 12px; background: #eafaf1; border-radius: 8px; margin-bottom: 20px; font-size: 14px; display: flex; justify-content: space-between; align-items: center; color: #27ae60; border: 1px solid #c3e6cb;}
    `;

    const htmlTemplate = `
        <div class="container">
            <button class="close-btn" id="closeBtn">×</button>
            <div class="header">
                <h1>🏫 空闲教室高级查询</h1>
                <p>自动从当前页面提取课表，快速找到能连续空闲的自习室</p>
            </div>

            <div id="statusPanel" class="status-panel">
                <span>正在提取数据...</span>
                <button class="btn" style="padding: 6px 12px; font-size: 12px;" id="refreshBtn">🔄 重新提取</button>
            </div>

            <div id="message"></div>

            <div class="input-section">
                <div class="input-group">
                    <label>我要从什么时候开始自习？（选择起始时间段）</label>
                    <div class="time-slots" id="timeSlots"></div>
                </div>
                <button class="btn" id="searchBtn">查询符合条件的教室</button>
            </div>

            <div id="statsContainer" style="display: none;" class="stats"></div>
            <div id="resultsContainer"></div>
        </div>
    `;

    const styleEl = document.createElement('style');
    styleEl.textContent = styles;
    const contentEl = document.createElement('div');
    contentEl.innerHTML = htmlTemplate;
    shadow.appendChild(styleEl);
    shadow.appendChild(contentEl);

    // ==========================================
    // 3. 业务逻辑
    // ==========================================
    let classroomData = {};
    const timeSlotNames = ['1', '2', '3', '4', '5'];
    const timeSlotDesc = ['上午1-2节', '上午3-4节', '下午1-2节', '下午3-4节', '晚上'];
    let selectedTimeSlot = null;

    // 获取内部 DOM 元素的快捷方法
    const $ = (id) => shadow.getElementById(id);

    // 绑定事件
    $('closeBtn').onclick = () => host.classList.remove('show');
    $('refreshBtn').onclick = () => extractData();
    $('searchBtn').onclick = () => searchClassrooms();

    // 初始化时间段按钮
    function initTimeSlots() {
        const container = $('timeSlots');
        container.innerHTML = '';
        for (let i = 0; i < 5; i++) {
            const btn = document.createElement('button');
            btn.className = 'time-slot';
            btn.textContent = timeSlotNames[i];
            btn.title = timeSlotDesc[i];
            btn.onclick = () => selectTimeSlot(i, btn);
            container.appendChild(btn);
        }
    }

    // 提取教务系统数据 (原 extract-final.js 逻辑)
    function extractData() {
        $('statusPanel').innerHTML = '<span>🔄 正在嗅探并提取页面上的教室数据...</span>';
        $('resultsContainer').innerHTML = '';
        $('statsContainer').style.display = 'none';
        $('message').innerHTML = '';
        classroomData = {};
        let successCount = 0;

        try {
            const rows = document.querySelectorAll('.tableLine___2zgYJ');
            
            if (rows.length === 0) {
                 $('statusPanel').innerHTML = '<span style="color: #e74c3c;">⚠️ 未在当前页面找到教室数据。请确保您已经点击了【查询】并在网页上看到了课表，或者尝试向下滚动加载更多。</span><button class="btn" style="padding: 6px 12px; font-size: 12px; background: #e74c3c" id="refreshBtn">重试</button>';
                 $('refreshBtn').onclick = extractData;
                 return;
            }

            rows.forEach((row) => {
                const roomNameElement = row.querySelector('.roomName___3hARr');
                if (!roomNameElement) return;
                
                let roomName = roomNameElement.textContent.trim();
                if (roomName === '教室' || !roomName.includes('-')) return;
                
                const allBlocks = row.querySelectorAll('.roomSquare___3tBm7');
                if (allBlocks.length === 0) return;
                
                const schedule = [];
                let blockIndex = 0;
                
                // 处理前8个方块（4个时间段）：每2个为1组
                for (let i = 0; i < 8 && blockIndex < allBlocks.length; i += 2) {
                    const block1HasClass = allBlocks[blockIndex]?.classList.contains('usedRoom___3UEA9');
                    const block2HasClass = allBlocks[blockIndex + 1]?.classList.contains('usedRoom___3UEA9');
                    schedule.push(!!(block1HasClass || block2HasClass));
                    blockIndex += 2;
                }
                
                // 最后的方块（3个或更少）：算作第5个时间段
                if (blockIndex < allBlocks.length) {
                    let hasClassInLast = false;
                    while (blockIndex < allBlocks.length) {
                        if (allBlocks[blockIndex]?.classList.contains('usedRoom___3UEA9')) {
                            hasClassInLast = true;
                            break;
                        }
                        blockIndex++;
                    }
                    schedule.push(hasClassInLast);
                }
                
                // 补充到5个时间段
                while (schedule.length < 5) { schedule.push(false); }
                
                if (schedule.length === 5) {
                    classroomData[roomName] = schedule;
                    successCount++;
                }
            });

            $('statusPanel').innerHTML = `<span>✅ 成功抓取到当前页面的 <b>${successCount}</b> 个教室数据。可以开始检索！</span><button class="btn" style="padding: 6px 12px; font-size: 12px;" id="refreshBtn">🔄 重新提取</button>`;
            $('refreshBtn').onclick = extractData;

        } catch (error) {
             $('statusPanel').innerHTML = `<span style="color: #e74c3c;">❌ 提取错误: ${error.message}</span><button class="btn" style="padding: 6px 12px; font-size: 12px; background: #e74c3c" id="refreshBtn">重试</button>`;
             $('refreshBtn').onclick = extractData;
        }
    }

    // 选择时间段
    function selectTimeSlot(index, element) {
        shadow.querySelectorAll('.time-slot').forEach(el => el.classList.remove('selected'));
        element.classList.add('selected');
        selectedTimeSlot = index;
    }

    // 执行查询
    function searchClassrooms() {
        const messageEl = $('message');

        if (Object.keys(classroomData).length === 0) {
            messageEl.innerHTML = '<div class="error-message">❌ 暂无教室数据，请先确保数据提取成功。</div>';
            return;
        }

        if (selectedTimeSlot === null) {
            messageEl.innerHTML = '<div class="error-message">❌ 请先点击上方数字选择你要开始自习的时间段。</div>';
            $('resultsContainer').innerHTML = '';
            $('statsContainer').style.display = 'none';
            return;
        }

        const results = [];
        for (const [roomName, schedule] of Object.entries(classroomData)) {
            const continuousSlots = [];
            for (let i = selectedTimeSlot; i < schedule.length; i++) {
                if (!schedule[i]) {
                    continuousSlots.push(timeSlotNames[i]);
                } else {
                    break;
                }
            }
            if (continuousSlots.length > 0) {
                results.push({
                    room: roomName,
                    slots: continuousSlots.join(' ')
                });
            }
        }

        displayResults(results);
        messageEl.innerHTML = '<div class="success-message">✓ 查询完成</div>';
        
        // 自动隐藏3秒后的成功消息
        setTimeout(() => { if ($('message').innerHTML.includes('查询完成')) $('message').innerHTML = ''; }, 3000);
    }

    // 渲染结果
    function displayResults(results) {
        const container = $('resultsContainer');
        const statsContainer = $('statsContainer');

        if (results.length === 0) {
            container.innerHTML = '<div class="no-results">🔍 未找到在你选定的时间段起有空闲的教室</div>';
            statsContainer.style.display = 'none';
            return;
        }

        statsContainer.innerHTML = `
            <div class="stat-card">
                <div class="label">找到可用教室数</div>
                <div class="value">${results.length}</div>
            </div>
            <div class="stat-card">
                <div class="label">要求的起始时间段</div>
                <div class="value">${timeSlotDesc[selectedTimeSlot]}</div>
            </div>
        `;
        statsContainer.style.display = 'grid';

        let html = `
            <div class="results-section">
                <div class="results-title">
                    <h2>查询结果</h2>
                    <span class="results-count">${results.length}个</span>
                </div>
                <table class="results-table">
                    <thead>
                        <tr>
                            <th>教室号</th>
                            <th>该教室全天课表概览</th>
                            <th>可连续自习时间段</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        results.forEach(result => {
            const schedule = classroomData[result.room];
            let blocksHtml = '<div class="time-slot-visual">';
            schedule.forEach((hasClass) => {
                blocksHtml += `<span class="block ${hasClass ? 'has-course' : 'no-course'}" title="${hasClass ? '有课' : '没课'}"></span>`;
            });
            blocksHtml += '</div>';

            html += `
                <tr>
                    <td class="room-name">${result.room}</td>
                    <td>${blocksHtml}</td>
                    <td class="time-slots-result">${result.slots}</td>
                </tr>
            `;
        });

        html += `
                    </tbody>
                </table>
            </div>
        `;

        container.innerHTML = html;
    }

    // ==========================================
    // 4. 弹出逻辑触发
    // ==========================================
    floatBtn.addEventListener('click', () => {
        host.classList.add('show');
        initTimeSlots();
        extractData(); // 每次打开时自动提取一次
    });

})();
