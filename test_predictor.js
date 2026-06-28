const fs = require('fs');
const path = require('path');

const jsonPath = path.join(__dirname, 'dataset.json');

try {
  console.log('Loading dataset.json...');
  const rawData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  console.log('Successfully loaded JSON database.');
  
  const courses = Object.keys(rawData);
  console.log(`Number of courses found: ${courses.length}`);
  
  const normalized = {};
  const uniqueColleges = new Set();
  
  for (const course in rawData) {
    normalized[course] = rawData[course].map(item => {
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
      
      if (collegeName) uniqueColleges.add(`${collegeCode}-${collegeName}`);
      
      return {
        code: collegeCode,
        college: collegeName,
        type: collegeType,
        phase1_ranks: item.phase1_ranks || {},
        phase2_ranks: item.phase2_ranks || {},
        phase3_ranks: item.phase3_ranks || {},
        stray_ranks: item.stray_ranks || {}
      };
    });
  }
  
  console.log(`Total normalized colleges: ${uniqueColleges.size}`);
  
  const testRank = 5000;
  const testCourse = 'Computer Science & Engineering';
  const testCategory = 'SM';
  
  console.log(`\n--- Running prediction for Rank: ${testRank}, Course: "${testCourse}", Category: "${testCategory}" ---`);
  
  const colleges = normalized[testCourse] || [];
  console.log(`Colleges offering this course: ${colleges.length}`);
  
  const p1Matches = colleges.filter(c => {
    const cutoff = c.phase1_ranks[testCategory];
    return cutoff !== undefined && testRank <= cutoff;
  });
  
  const p2Matches = colleges.filter(c => {
    const cutoff = c.phase2_ranks[testCategory];
    return cutoff !== undefined && testRank <= cutoff;
  });
  
  const p3Matches = colleges.filter(c => {
    const cutoff = c.phase3_ranks[testCategory];
    return cutoff !== undefined && testRank <= cutoff;
  });
  
  const strayMatches = colleges.filter(c => {
    const cutoff = c.stray_ranks[testCategory];
    return cutoff !== undefined && testRank <= cutoff;
  });
  
  console.log(`Phase 1 Allotments found: ${p1Matches.length}`);
  console.log(`Phase 2 Allotments found: ${p2Matches.length}`);
  console.log(`Phase 3 Allotments found: ${p3Matches.length}`);
  console.log(`Stray Allotments found: ${strayMatches.length}`);
  
  console.log('\nSample matching colleges (Phase 2):');
  p2Matches.slice(0, 5).forEach(c => {
    console.log(`- [${c.code}] ${c.college} | Cutoff: ${c.phase2_ranks[testCategory]} | Type: ${c.type}`);
  });
  
  if (p2Matches.length > 0 || p3Matches.length > 0) {
    console.log('\nPrediction engine tests PASSED successfully.');
  } else {
    throw new Error('Prediction test did not return any colleges. Please double check rank parameters.');
  }
  
} catch (err) {
  console.error('Test failed with error:', err);
  process.exit(1);
}
