import SparklesIcon from "@/components/SparklesIcon";
import {transcriptionItemsToSrt} from "@/libs/awsTranscriptionHelpers";
import {FFmpeg} from "@ffmpeg/ffmpeg";
import {toBlobURL, fetchFile} from "@ffmpeg/util";
import {useEffect, useState, useRef} from "react";
import roboto from './../fonts/Roboto-Regular.ttf';
import robotoBold from './../fonts/Roboto-Bold.ttf';

export default function ResultVideo({filename,transcriptionItems}) {
  const videoUrl = "https://jinna-captions-project.s3.amazonaws.com/"+filename;
  const [loaded, setLoaded] = useState(false);
  const [primaryColor, setPrimaryColor] = useState('#FFFFFF');
  const [outlineColor, setOutlineColor] = useState('#000000');
  const [progress, setProgress] = useState(1);
  const ffmpegRef = useRef(new FFmpeg());
  const videoRef = useRef(null);
  const [fontSize, setFontSize] = useState(30);
  const [marginV, setMarginV] = useState(70);

  useEffect(() => {
    videoRef.current.src = videoUrl;
    load();
  }, []);

  const load = async () => {
    const ffmpeg = ffmpegRef.current;
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.2/dist/umd'
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });
    await ffmpeg.writeFile('/tmp/roboto.ttf', await fetchFile(roboto));
    await ffmpeg.writeFile('/tmp/roboto-bold.ttf', await fetchFile(robotoBold));
    setLoaded(true);
  }

  function toFFmpegColor(rgb) {
    const bgr = rgb.slice(5,7) + rgb.slice(3,5) + rgb.slice(1,3);
    return '&H' + bgr + '&';
  }

  const transcode = async () => {
    const ffmpeg = ffmpegRef.current;
    const srt = transcriptionItemsToSrt(transcriptionItems);
    await ffmpeg.writeFile(filename, await fetchFile(videoUrl));
    await ffmpeg.writeFile('subs.srt', srt);
    videoRef.current.src = videoUrl;
    await new Promise((resolve, reject) => {
      videoRef.current.onloadedmetadata = resolve;
    });
    const duration = videoRef.current.duration;
    ffmpeg.on('log', ({ message }) => {
      const regexResult = /time=([0-9:.]+)/.exec(message);
      if (regexResult && regexResult?.[1]) {
        const howMuchIsDone = regexResult?.[1];
        const [hours,minutes,seconds] = howMuchIsDone.split(':');
        const doneTotalSeconds = hours * 3600 + minutes * 60 + seconds;
        const videoProgress = doneTotalSeconds / duration;
        setProgress(videoProgress);
      }
    });
    await ffmpeg.exec([
      '-i', filename,
      '-preset', 'ultrafast',
      '-vf', `subtitles=subs.srt:fontsdir=/tmp:force_style='Fontname=Roboto Bold,FontSize=${fontSize},MarginV=${marginV},PrimaryColour=${toFFmpegColor(primaryColor)},OutlineColour=${toFFmpegColor(outlineColor)}'`,
      'output.mp4'
    ]);
    const data = await ffmpeg.readFile('output.mp4');
    videoRef.current.src =
      URL.createObjectURL(new Blob([data.buffer], {type: 'video/mp4'}));
    setProgress(1);
  }

  return (
    <>
      <div className="my-2 gap-y-2">
        Primary color:
        <input type="color"
               value={primaryColor}
               onChange={ev => setPrimaryColor(ev.target.value)}/>
        <br/>
        Outline color:
        <input type="color"
               value={outlineColor}
               onChange={ev => setOutlineColor(ev.target.value)}/>
        <br/>
        <div className="flex gap-1">
          <div>
            Font Size:
            <input className="w-16 text-black/70 rounded-lg py-1 text-center font-medium"
                  type="number"
                  value={fontSize}
                  onChange={ev => setFontSize(ev.target.value)}
                  min="1"
                  step="1"/>
          </div>
          <div>
            Margin Virticle:
            <input className="w-16 text-black/70 rounded-lg py-1 text-center font-medium"
                  type="number"
                  value={marginV}
                  onChange={ev => setMarginV(ev.target.value)}
                  min="0"
                  step="1"/>
          </div>
        </div>
      </div>
      <div className="mb-4 mt-4">
        <button
          onClick={transcode}
          className="bg-green-600 py-2 px-6 rounded-full inline-flex gap-2 border-2 border-yellow-900/40 cursor-pointer">
          <SparklesIcon />
          <span>Apply captions</span>
        </button>
      </div>
      <div className="rounded-xl overflow-hidden relative">
        {progress && progress < 1 && (
          <div className="absolute inset-0 bg-black/80 flex items-center">
            <div className="w-full text-center">
              <div className="bg-bg-gradient-from/50 mx-8 rounded-lg overflow-hidden relative">
                <div className="bg-bg-gradient-from h-8"
                     style={{width:progress * 100+'%'}}>
                  <h3 className="text-white text-xl absolute inset-0 py-1">
                    {parseInt(progress * 100)}%
                  </h3>
                </div>
              </div>
            </div>
          </div>
        )}
        <video
          data-video={0}
          ref={videoRef}
          controls>
        </video>
        <div className="absolute inset-0 flex place-items-end justify-center" style={{ pointerEvents: 'none' }}>
          <p className="text-xl" style={{
              fontSize: `${fontSize}px`,
              marginBottom: `${marginV}px`,
              color: primaryColor,
              WebkitTextStroke: `0.25px ${outlineColor}`
            }}>
              Subtitle Preview
          </p>
        </div>
      </div>
    </>
  );
}