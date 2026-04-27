import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Home from './pages/Home';
import PDFToolkit from './tools/PDFToolkit';
import PassportPhoto from './tools/PassportPhoto';
import ResumeBuilder from './tools/ResumeBuilder';
import VideoCompressor from './tools/VideoCompressor';
import HeicConverter from './tools/HeicConverter';
import BackgroundEraser from './tools/BackgroundEraser';
import ImageConverter from './tools/ImageConverter';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="pdf-toolkit" element={<PDFToolkit />} />
          <Route path="passport-photo" element={<PassportPhoto />} />
          <Route path="resume-builder" element={<ResumeBuilder />} />
          <Route path="video-compressor" element={<VideoCompressor />} />
          <Route path="heic-converter" element={<HeicConverter />} />
          <Route path="background-eraser" element={<BackgroundEraser />} />
          <Route path="image-converter" element={<ImageConverter />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
