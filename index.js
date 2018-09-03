const fs = require('fs');
const https = require('https');
const { URL } = require('url');

const courseId = 145211;
let videoId = 166591;
const path = 'file:///D:/Videos/Courses';
const dirPath = new URL(path);
const url = `https://www.lynda.com/ajax/player/transcript?courseId=${courseId}&videoId=`;
/* const url = new URL(
  `https://www.lynda.com/ajax/player/transcript?courseId=${courseId}&videoId=${videoId}`
); */

const readFileName = new Promise((resolve, reject) => {
  const nameArr = new Array();
  fs.readdir(dirPath, (err, files) => {
    if (err) {
      reject(err);
    } else {
      files
        .filter(file => {
          return file.endsWith('.mp4');
        })
        .forEach(file => {
          nameArr.push(file);
        });
      resolve(nameArr);
    }
  });
});

readFileName
  .then(filesName => {
    let prevChapterId = 0;
    let prevVideoId = videoId;

    filesName.forEach(file => {
      const chapterName = /^\d{2}_\d{2}/.exec(file);
      const subtitlePath = new URL(`${path}/${file.replace('.mp4', '')}.vtt`);
      let chapterArr;
      let chapterId;
      let subChapterId;

      if (chapterName.length) {
        chapterArr = chapterName[0].split('_');
        chapterId = Number(chapterArr[0]);
        subChapterId = Number(chapterArr[1]);
      } else {
        return;
      }

      if (chapterId === prevChapterId) {
        prevVideoId = videoId + subChapterId;
      } else {
        prevChapterId = chapterId;
        videoId = prevVideoId + 1;
        prevVideoId = videoId + subChapterId;
      }

      const chapterUrl = new URL(`${url}${prevVideoId}`);

      const getSubtitle = https.request(chapterUrl, res => {
        res.on('data', data => {
          const dataObj = data
            .toString()
            .replace(/^\{(.+)\}$.*/g, '$1')
            .trim()
            .split(',')
            .map(obj =>
              obj
                .replace(/\"(.+)\"/, '$1')
                .split('=')
                .map(prop => `"${prop.trim()}"`)
                .join(':')
            )
            .join(',');
          if (data.toString().length === 53) {
            console.error(JSON.parse(`{${dataObj}}`).Message);
          } else {
            fs.writeFile(subtitlePath, data, err => {
              if (err) {
                throw err;
              }
            });
          }
        });
      });

      getSubtitle.on('error', err => {
        console.error(err.message);
      });

      getSubtitle.end();
    });
  })
  .catch(err => {
    console.error(err);
  });
