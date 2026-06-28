(() => {
  let rawData = null;
  let normalizedData = null;
  let coursesList = [];
  let selectedCourse = '';
  let activePredictCategory = 'SM';
  let activePredictRank = 0;

  let phase1Matches = [];
  let phase2Matches = [];
  let currentTab = 1;

  let searchTerm = '';
  let sortBy = 'cutoffAsc';
  const typeFilters = {
    G: true,
    N: true,
    S: true
  };

  const themeToggle = document.getElementById('themeToggle');
  const themeToggleIcon = document.getElementById('themeToggleIcon');
  const rankInput = document.getElementById('rankInput');
  const rankError = document.getElementById('rankError');
  const categorySelect = document.getElementById('categorySelect');

  const courseDropdownBtn = document.getElementById('courseDropdownBtn');
  const courseDropdownPanel = document.getElementById('courseDropdownPanel');
  const courseDropdownSearch = document.getElementById('courseDropdownSearch');
  const courseDropdownList = document.getElementById('courseDropdownList');
  const selectedCourseLabel = document.getElementById('selectedCourseLabel');
  const courseError = document.getElementById('courseError');

  const predictBtn = document.getElementById('predictBtn');
  const loadingState = document.getElementById('loadingState');
  const initialState = document.getElementById('initialState');
  const resultsPanel = document.getElementById('resultsPanel');

  const statCourses = document.getElementById('statCourses');
  const statColleges = document.getElementById('statColleges');

  const resultsTitleCourse = document.getElementById('resultsTitleCourse');
  const resultsTitleDetails = document.getElementById('resultsTitleDetails');
  const summaryRank = document.getElementById('summaryRank');
  const summaryCategory = document.getElementById('summaryCategory');

  const tabPhase1 = document.getElementById('tabPhase1');
  const tabPhase2 = document.getElementById('tabPhase2');
  const badgePhase1Count = document.getElementById('badgePhase1Count');
  const badgePhase2Count = document.getElementById('badgePhase2Count');

  const resultsSearchInput = document.getElementById('resultsSearchInput');
  const sortBySelect = document.getElementById('sortBySelect');

  const filterTypeGovt = document.getElementById('filterTypeGovt');
  const filterTypeAided = document.getElementById('filterTypeAided');
  const filterTypeSelf = document.getElementById('filterTypeSelf');

  const cardsContainer = document.getElementById('cardsContainer');
  const noResultsState = document.getElementById('noResultsState');

  function updateThemeIcon(isDark) {
    if (isDark) {
      themeToggleIcon.className = "fa-solid fa-sun text-[#e5fe40]";
    } else {
      themeToggleIcon.className = "fa-solid fa-moon text-black";
    }
  }

  function initTheme() {
    const userPref = localStorage.getItem('theme');
    const isDark = userPref === 'dark';
    
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    updateThemeIcon(isDark);
  }

  themeToggle.addEventListener('click', () => {
    const isDark = document.documentElement.classList.contains('dark');
    if (isDark) {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
      updateThemeIcon(false);
    } else {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
      updateThemeIcon(true);
    }
  });

  function normalizeData(data) {
    const normalized = {};
    const uniqueColleges = new Set();

    for (const course in data) {
      normalized[course] = data[course].map(item => {
        let collegeName = item.college ? item.college.trim() : '';
        let collegeType = item.type ? item.type.trim() : '';
        let collegeCode = item.code ? item.code.trim() : '';

        if (!collegeName && collegeType && collegeType.length > 1) {
          collegeName = collegeType;
          collegeType = 'S';
        }

        if (collegeType !== 'G' && collegeType !== 'N' && collegeType !== 'S') {
          const lowerName = collegeName.toLowerCase();
          if (lowerName.includes('govt') || lowerName.includes('government')) {
            collegeType = 'G';
          } else if (
            lowerName.includes('aided') || 
            lowerName.includes('nss college') || 
            lowerName.includes('t.k.m.') || 
            lowerName.includes('tkm college') || 
            lowerName.includes('m.a. college') || 
            lowerName.includes('maco') ||
            lowerName.includes('lbs institute') ||
            lowerName.includes('lbs college') ||
            lowerName.includes('college of engineering, karunagappally') ||
            lowerName.includes('college of engineering, thalassery') ||
            lowerName.includes('college of engineering, perumon') ||
            lowerName.includes('college of engineering, kidangoor') ||
            lowerName.includes('college of engineering, vadakara') ||
            lowerName.includes('college of engineering, trikaripur')
          ) {
            collegeType = 'N';
          } else {
            collegeType = 'S';
          }
        }

        if (collegeName) {
          uniqueColleges.add(`${collegeCode}-${collegeName}`);
        }

        return {
          code: collegeCode,
          college: collegeName,
          type: collegeType,
          phase1_ranks: item.phase1_ranks || {},
          phase2_ranks: item.phase2_ranks || {}
        };
      });
    }

    statColleges.innerText = uniqueColleges.size;
    return normalized;
  }

  async function loadData() {
    if (window.location.protocol === 'file:') {
      alert('Browser CORS Alert: You are viewing this page directly via file:// protocol. Modern browsers block local file fetches (dataset.json) for security. Please start a local web server (e.g. running "npm run dev") and navigate to the local URL (e.g. http://localhost:8087) instead.');
      statCourses.innerText = 'CORS Error';
      statColleges.innerText = 'CORS Error';
      return;
    }

    try {
      statCourses.innerHTML = '<i class="fa-solid fa-spinner fa-spin text-xs"></i>';
      statColleges.innerHTML = '<i class="fa-solid fa-spinner fa-spin text-xs"></i>';

      const response = await fetch('dataset.json?v=' + Date.now());
      if (!response.ok) {
        throw new Error(`Failed to load data: ${response.statusText}`);
      }
      
      rawData = await response.json();
      normalizedData = normalizeData(rawData);
      coursesList = Object.keys(normalizedData).sort();

      statCourses.innerText = coursesList.length;

      populateCourseDropdown(coursesList);
      
    } catch (error) {
      console.error('Error loading allotment data:', error);
      alert('Failed to load allotment database. Please make sure dataset.json is in the root directory.');
      statCourses.innerText = 'Error';
      statColleges.innerText = 'Error';
    }
  }

  let dropdownOpen = false;

  function toggleDropdown(show) {
    dropdownOpen = (show !== undefined) ? show : !dropdownOpen;
    if (dropdownOpen) {
      courseDropdownPanel.classList.remove('hidden');
      courseDropdownSearch.value = '';
      populateCourseDropdown(coursesList);
      setTimeout(() => courseDropdownSearch.focus(), 50);
    } else {
      courseDropdownPanel.classList.add('hidden');
    }
  }

  courseDropdownBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleDropdown();
  });

  document.addEventListener('click', (e) => {
    if (!courseDropdownBtn.contains(e.target) && !courseDropdownPanel.contains(e.target)) {
      toggleDropdown(false);
    }
  });

  function populateCourseDropdown(courses) {
    courseDropdownList.innerHTML = '';
    
    if (courses.length === 0) {
      courseDropdownList.innerHTML = `<li class="p-3 text-slate-500 dark:text-slate-400 text-center italic select-none">No courses match</li>`;
      return;
    }

    courses.forEach(course => {
      const li = document.createElement('li');
      li.className = "p-3 hover:bg-slate-100 dark:hover:bg-black cursor-pointer text-black dark:text-white transition-colors truncate";
      li.textContent = course.toUpperCase();
      
      li.addEventListener('click', () => {
        selectedCourse = course;
        selectedCourseLabel.textContent = course.toUpperCase();
        selectedCourseLabel.classList.remove('text-slate-500', 'dark:text-slate-400');
        selectedCourseLabel.classList.add('text-black', 'dark:text-white');
        courseError.classList.add('hidden');
        toggleDropdown(false);
      });

      courseDropdownList.appendChild(li);
    });
  }

  courseDropdownSearch.addEventListener('input', () => {
    const query = courseDropdownSearch.value.trim().toLowerCase();
    const filtered = coursesList.filter(course => course.toLowerCase().includes(query));
    populateCourseDropdown(filtered);
  });

  predictBtn.addEventListener('click', () => {
    const rankVal = parseInt(rankInput.value, 10);
    let hasError = false;

    if (isNaN(rankVal) || rankVal <= 0) {
      rankError.classList.remove('hidden');
      hasError = true;
    } else {
      rankError.classList.add('hidden');
    }

    if (!selectedCourse) {
      courseError.classList.remove('hidden');
      hasError = true;
    } else {
      courseError.classList.add('hidden');
    }

    if (hasError) return;

    activePredictRank = rankVal;
    activePredictCategory = categorySelect.value;

    runPrediction();
  });

  function runPrediction() {
    initialState.classList.add('hidden');
    resultsPanel.classList.add('hidden');
    loadingState.classList.remove('hidden');

    setTimeout(() => {
      const colleges = normalizedData[selectedCourse] || [];

      phase1Matches = colleges.filter(college => {
        const cutoff = college.phase1_ranks[activePredictCategory];
        return cutoff !== undefined && activePredictRank <= cutoff;
      });

      phase2Matches = colleges.filter(college => {
        const cutoff = college.phase2_ranks[activePredictCategory];
        return cutoff !== undefined && activePredictRank <= cutoff;
      });

      resultsTitleCourse.innerText = selectedCourse.toUpperCase();
      summaryRank.innerText = activePredictRank.toLocaleString();
      
      const catText = categorySelect.options[categorySelect.selectedIndex].text;
      summaryCategory.innerText = catText.toUpperCase();

      badgePhase1Count.innerText = phase1Matches.length;
      badgePhase2Count.innerText = phase2Matches.length;

      loadingState.classList.add('hidden');
      resultsPanel.classList.remove('hidden');

      switchTab(1);
    }, 350);
  }

  function switchTab(phase) {
    currentTab = phase;

    const activeTabClass = "px-4 py-2.5 text-xs font-black uppercase border-2 border-black dark:border-[#cbd5e0] bg-white dark:bg-[#22242d] text-black dark:text-[#f3f4f6] shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(203,213,224,1)] translate-x-[-1px] translate-y-[-1px] rounded-none cursor-pointer transition-all";
    const inactiveTabClass = "px-4 py-2.5 text-xs font-black uppercase text-slate-500 dark:text-slate-400 bg-transparent hover:text-black dark:hover:text-[#f3f4f6] rounded-none cursor-pointer border-2 border-transparent transition-all";

    if (phase === 1) {
      tabPhase1.className = activeTabClass;
      tabPhase2.className = inactiveTabClass;
      
      badgePhase1Count.className = "ml-1.5 px-2 py-0.5 text-xs bg-black text-white dark:bg-[#cbd5e0] dark:text-black font-extrabold select-none";
      badgePhase2Count.className = "ml-1.5 px-2 py-0.5 text-xs bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-extrabold select-none";
    } else {
      tabPhase2.className = activeTabClass;
      tabPhase1.className = inactiveTabClass;
      
      badgePhase2Count.className = "ml-1.5 px-2 py-0.5 text-xs bg-black text-white dark:bg-[#cbd5e0] dark:text-black font-extrabold select-none";
      badgePhase1Count.className = "ml-1.5 px-2 py-0.5 text-xs bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-extrabold select-none";
    }

    renderResults();
  }

  tabPhase1.addEventListener('click', () => switchTab(1));
  tabPhase2.addEventListener('click', () => switchTab(2));

  resultsSearchInput.addEventListener('input', () => {
    searchTerm = resultsSearchInput.value.trim();
    renderResults();
  });

  sortBySelect.addEventListener('change', () => {
    sortBy = sortBySelect.value;
    renderResults();
  });

  function setupTypeFilter(buttonElement, typeKey) {
    buttonElement.addEventListener('click', () => {
      typeFilters[typeKey] = !typeFilters[typeKey];
      
      if (typeFilters[typeKey]) {
        buttonElement.querySelector('i').className = "fa-solid fa-circle-check mr-1.5 text-[10px]";
        if (typeKey === 'G') {
          buttonElement.className = "px-3.5 py-1.5 text-xs font-black border-2 border-black dark:border-[#cbd5e0] bg-[#00ff66] text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(203,213,224,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all select-none cursor-pointer flex items-center";
        } else if (typeKey === 'N') {
          buttonElement.className = "px-3.5 py-1.5 text-xs font-black border-2 border-black dark:border-[#cbd5e0] bg-[#ff9900] text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(203,213,224,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all select-none cursor-pointer flex items-center";
        } else {
          buttonElement.className = "px-3.5 py-1.5 text-xs font-black border-2 border-black dark:border-[#cbd5e0] bg-[#00e0ff] text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(203,213,224,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all select-none cursor-pointer flex items-center";
        }
      } else {
        buttonElement.querySelector('i').className = "fa-regular fa-circle mr-1.5 text-[10px]";
        buttonElement.className = "px-3.5 py-1.5 text-xs font-bold border-2 border-[#b0b0a0] dark:border-[#3f4452] bg-[#e3e3dc] dark:bg-[#22242d] text-[#888880] dark:text-[#8892b0] transition-all select-none cursor-pointer flex items-center";
      }
      
      renderResults();
    });
  }

  setupTypeFilter(filterTypeGovt, 'G');
  setupTypeFilter(filterTypeAided, 'N');
  setupTypeFilter(filterTypeSelf, 'S');

  function renderResults() {
    cardsContainer.innerHTML = '';
    
    const matches = currentTab === 1 ? phase1Matches : phase2Matches;

    let filtered = matches.filter(college => {
      const nameMatch = college.college.toLowerCase().includes(searchTerm.toLowerCase());
      const codeMatch = college.code.toLowerCase().includes(searchTerm.toLowerCase());
      return nameMatch || codeMatch;
    });

    filtered = filtered.filter(college => {
      return typeFilters[college.type] === true;
    });

    if (filtered.length === 0) {
      cardsContainer.classList.add('hidden');
      noResultsState.classList.remove('hidden');
      
      if (matches.length === 0) {
        document.getElementById('noResultsTitle').innerText = "NO COLLEGES FOUND";
        document.getElementById('noResultsMessage').innerHTML = `
          YOUR KEAM RANK OF <strong class="text-indigo-600 dark:text-[#e5fe40]">${activePredictRank}</strong> IS LOWER THAN THE LAST YEAR'S CUTOFF FOR ALL COLLEGES OFFERING THIS COURSE IN THE <strong>${activePredictCategory}</strong> CATEGORY IN THIS PHASE.
        `;
      } else {
        document.getElementById('noResultsTitle').innerText = "NO MATCHING FILTERS";
        document.getElementById('noResultsMessage').innerText = "NO COLLEGES FIT YOUR CURRENT SEARCH QUERY OR COLLEGE TYPE FILTERS. TRY ADJUSTING THEM ABOVE.";
      }
      return;
    }

    noResultsState.classList.add('hidden');
    cardsContainer.classList.remove('hidden');

    filtered.sort((a, b) => {
      const cutoffA = currentTab === 1 ? a.phase1_ranks[activePredictCategory] : a.phase2_ranks[activePredictCategory];
      const cutoffB = currentTab === 1 ? b.phase1_ranks[activePredictCategory] : b.phase2_ranks[activePredictCategory];

      if (sortBy === 'cutoffAsc') return cutoffA - cutoffB;
      if (sortBy === 'cutoffDesc') return cutoffB - cutoffA;
      if (sortBy === 'nameAsc') return a.college.localeCompare(b.college);
      if (sortBy === 'codeAsc') return a.code.localeCompare(b.code);
      return 0;
    });

    filtered.forEach((college, index) => {
      const card = document.createElement('div');
      
      let badgeHtml = '';
      let hoverGlowClass = '';
      
      if (college.type === 'G') {
        badgeHtml = `
          <span class="text-[9px] px-2 py-0.5 border border-black dark:border-[#cbd5e0] bg-[#00ff66] text-black font-extrabold uppercase tracking-wider flex items-center select-none shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0,1)] dark:shadow-[1.5px_1.5px_0px_0px_rgba(203,213,224,1)]">
            <i class="fa-solid fa-building-columns mr-1 text-[8px]"></i> Government
          </span>`;
        hoverGlowClass = 'hover:border-[#00ff66] dark:hover:border-[#00ff66] hover:shadow-[9px_9px_0px_0px_#00ff66] dark:hover:shadow-[9px_9px_0px_0px_#00ff66]';
      } else if (college.type === 'N') {
        badgeHtml = `
          <span class="text-[9px] px-2 py-0.5 border border-black dark:border-[#cbd5e0] bg-[#ff9900] text-black font-extrabold uppercase tracking-wider flex items-center select-none shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0,1)] dark:shadow-[1.5px_1.5px_0px_0px_rgba(203,213,224,1)]">
            <i class="fa-solid fa-handshake-angle mr-1 text-[8px]"></i> Govt-Aided
          </span>`;
        hoverGlowClass = 'hover:border-[#ff9900] dark:hover:border-[#ff9900] hover:shadow-[9px_9px_0px_0px_#ff9900] dark:hover:shadow-[9px_9px_0px_0px_#ff9900]';
      } else {
        badgeHtml = `
          <span class="text-[9px] px-2 py-0.5 border border-black dark:border-[#cbd5e0] bg-[#00e0ff] text-black font-extrabold uppercase tracking-wider flex items-center select-none shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0,1)] dark:shadow-[1.5px_1.5px_0px_0px_rgba(203,213,224,1)]">
            <i class="fa-solid fa-graduation-cap mr-1 text-[8px]"></i> Self-Financing
          </span>`;
        hoverGlowClass = 'hover:border-[#00e0ff] dark:hover:border-[#00e0ff] hover:shadow-[9px_9px_0px_0px_#00e0ff] dark:hover:shadow-[9px_9px_0px_0px_#00e0ff]';
      }

      const cutoff = currentTab === 1 ? college.phase1_ranks[activePredictCategory] : college.phase2_ranks[activePredictCategory];

      card.className = `p-4 sm:p-5 border-2 border-black dark:border-[#cbd5e0] bg-white dark:bg-[#1a1c23] shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_0px_rgba(203,213,224,1)] hover:translate-x-[-3px] hover:translate-y-[-3px] transition-all cursor-pointer group flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-in rounded-none ${hoverGlowClass}`;
      
      card.style.animationDelay = `${Math.min(index * 25, 250)}ms`;

      card.innerHTML = `
        <div class="flex items-start sm:items-center space-x-3.5 flex-1 min-w-0">
          <span class="font-mono text-xs font-black px-2 py-1 border-2 border-black dark:border-[#cbd5e0] bg-[#ffffff] dark:bg-[#12141a] text-black dark:text-[#f3f4f6] select-none shrink-0 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(203,213,224,1)]">
            ${college.code}
          </span>
          <div class="space-y-1.5 min-w-0">
            <div class="flex flex-wrap items-center gap-2">
              ${badgeHtml}
            </div>
            <h4 class="text-sm font-black text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-[#e5fe40] transition-colors uppercase tracking-wide leading-snug break-words">
              ${college.college}
            </h4>
          </div>
        </div>
        <div class="flex items-center justify-between sm:justify-end space-x-6 border-t-2 sm:border-t-0 pt-3 sm:pt-0 border-black dark:border-[#3f4452] shrink-0">
          <div class="text-left sm:text-right">
            <span class="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">Last Allotted Rank</span>
            <span class="text-base sm:text-lg font-black text-black dark:text-[#e5fe40]">${cutoff.toLocaleString()}</span>
          </div>
          <div class="flex items-center space-x-1.5 text-xs text-black dark:text-[#f3f4f6] group-hover:text-indigo-600 dark:group-hover:text-[#e5fe40] transition-colors select-none font-black uppercase tracking-wider">
            <span class="hidden sm:inline">Search</span>
            <i class="fa-solid fa-arrow-up-right-from-square text-[10px] transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform"></i>
          </div>
        </div>
      `;

      card.addEventListener('click', () => {
        openGoogleSearch(college.college);
      });

      cardsContainer.appendChild(card);
    });
  }

  function openGoogleSearch(collegeName) {
    const query = encodeURIComponent(`${collegeName} Kerala`);
    window.open(`https://www.google.com/search?q=${query}`, '_blank');
  }

  initTheme();
  loadData();
})();
