import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getLessonById, fetchEnrollmentStatus } from '../../services/apiService.js';
import { useApp } from '../../context/AppContext';
import { MindMapViewer } from '../../components/MindMapViewer.jsx';

/**
 * Lesson Content View Component
 * Adapted from reference implementation to work with Course Builder backend data model
 * Displays lesson content according to format_order from lesson.format_order
 */
export default function LessonContentView() {
  const { courseId, lessonId } = useParams();
  const navigate = useNavigate();
  const { theme, userProfile, userRole } = useApp();
  const [lesson, setLesson] = useState(null);
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const learnerId = userRole === 'learner' ? userProfile?.id : null;
  console.log('🔥 LESSON CONTENT VIEW RENDERED 🔥');

  useEffect(() => {
    loadLessonContent();
  }, [lessonId, courseId]);

  const loadLessonContent = async () => {
    try {
      setLoading(true);
      setError(null);

      // REGISTRATION GATING: Check enrollment before loading lesson
      if (userRole === 'learner' && learnerId) {
        const enrollmentData = await fetchEnrollmentStatus(courseId, learnerId);
        if (!enrollmentData.enrolled) {
          setError('You must be enrolled in this course to view lessons.');
          setLoading(false);
          navigate(`/course/${courseId}/overview`, { replace: true });
          return;
        }
        setIsEnrolled(true);
      } else if (userRole !== 'learner') {
        // Trainers/admins can always view
        setIsEnrolled(true);
      }

      // Fetch lesson data from our backend
      const lessonData = await getLessonById(lessonId);
      
      // DEBUG: Log raw lesson content EXACTLY once
      console.log('LESSON RAW:', lessonData);
      console.log('LESSON.content_data:', lessonData.content_data);
      
      setLesson(lessonData);

      // Extract course info if available in lesson response
      if (lessonData.course) {
        setCourse(lessonData.course);
      }
    } catch (err) {
      console.error('Failed to load lesson content:', err);
      setError(err.response?.data?.error || err.message || 'Failed to load lesson content');
    } finally {
      setLoading(false);
    }
  };

  const formatIcons = {
    text: 'fa-file-alt',
    code: 'fa-code',
    presentation: 'fa-presentation',
    audio: 'fa-volume-up',
    mind_map: 'fa-project-diagram',
    avatar_video: 'fa-video',
  };

  const formatLabels = {
    text: 'Text & Audio',
    code: 'Code Example',
    presentation: 'Presentation',
    audio: 'Audio Narration',
    mind_map: 'Mind Map',
    avatar_video: 'Avatar Video',
  };

  /**
   * Render Text + Audio combined content
   * MANDATORY: content_type: "text" always includes audio (when audioUrl exists)
   * This is a combined Text + Audio block, not text-only
   */
  const renderTextContent = (contentData, audioFirst = false) => {
    // Handle case where contentData might be a JSON string or already an object
    let parsedData = contentData;
    
    if (typeof contentData === 'string') {
      try {
        parsedData = JSON.parse(contentData);
      } catch (e) {
        parsedData = { text: contentData };
      }
    }
    
    if (!parsedData || typeof parsedData !== 'object') {
      parsedData = { text: String(contentData || '') };
    }

    const textValue = parsedData?.text || parsedData?.content || '';
    // Audio is always part of "text" content_type when audioUrl exists
    const hasAudio = !!parsedData?.audioUrl;

    // Render audio section (always part of text content block)
    const renderAudioSection = () => {
      if (!hasAudio) return null;
      
      return (
        <div
          className={`p-4 rounded-lg mt-4 ${
            theme === 'day-mode' ? 'bg-blue-50 border border-blue-200' : 'bg-blue-900/20 border border-blue-600/50'
          }`}
        >
          <div className="flex items-center gap-3 mb-3">
            <i className="fas fa-volume-up text-blue-600 text-xl"></i>
            <h4
              className={`font-semibold ${
                theme === 'day-mode' ? 'text-gray-900' : 'text-white'
              }`}
            >
              Audio Narration
            </h4>
            {parsedData?.audioDuration && (
              <span
                className={`text-sm ${
                  theme === 'day-mode' ? 'text-gray-600' : 'text-gray-400'
                }`}
              >
                ({Math.round(parsedData.audioDuration)}s)
              </span>
            )}
          </div>
          <audio controls className="w-full" style={{ maxWidth: '100%' }}>
            <source
              src={parsedData.audioUrl}
              type={`audio/${parsedData.audioFormat || 'mp3'}`}
            />
            Your browser does not support the audio element.
          </audio>
          {parsedData?.audioVoice && (
            <p
              className={`text-xs mt-2 ${
                theme === 'day-mode' ? 'text-gray-500' : 'text-gray-400'
              }`}
            >
              Voice: {parsedData.audioVoice}
            </p>
          )}
        </div>
      );
    };

    // If no text content, still render audio if available (audio is part of text content_type)
    if (!textValue || textValue.trim() === '') {
      if (hasAudio) {
        return (
          <div
            className={`p-4 rounded-lg ${
              theme === 'day-mode' ? 'bg-gray-50 border border-gray-200' : 'bg-[#334155] border border-white/10'
            }`}
          >
            {renderAudioSection()}
          </div>
        );
      }
      return (
        <div
          className={`p-4 rounded-lg ${
            theme === 'day-mode' ? 'bg-gray-50 border border-gray-200' : 'bg-[#334155] border border-white/10'
          }`}
        >
          <p className={theme === 'day-mode' ? 'text-gray-500' : 'text-gray-400'}>
            No text content available
          </p>
        </div>
      );
    }

    // Render combined Text + Audio block
    // Default: text first, then audio (unless audioFirst flag is true)
    return (
      <div
        className={`p-4 rounded-lg ${
          theme === 'day-mode' ? 'bg-gray-50 border border-gray-200' : 'bg-gray-900 border border-gray-700'
        }`}
      >
        {/* Show audio first if audioFirst flag is set */}
        {audioFirst && renderAudioSection()}
        
        {/* Text content */}
        <div
          className={`whitespace-pre-wrap font-sans ${
            theme === 'day-mode' ? 'text-gray-900' : 'text-gray-100'
          }`}
        >
          {textValue}
        </div>
        
        {/* Show audio after text (default behavior) */}
        {!audioFirst && renderAudioSection()}
      </div>
    );
  };

  const renderCodeContent = contentData => {
    let parsedData = contentData;
    if (typeof contentData === 'string') {
      try {
        parsedData = JSON.parse(contentData);
      } catch (e) {
        parsedData = { code: contentData };
      }
    }

    const codeValue = parsedData?.code || '';

    return (
      <div className="space-y-4">
        {codeValue ? (
          <div
            className={`p-4 rounded-lg ${
              theme === 'day-mode' ? 'bg-gray-900' : 'bg-[#0f172a]'
            }`}
          >
            <pre className="text-green-400 font-mono text-sm overflow-x-auto">
              {codeValue}
            </pre>
          </div>
        ) : (
          <div
            className={`p-4 rounded-lg ${
              theme === 'day-mode' ? 'bg-gray-50' : 'bg-[#334155]'
            }`}
          >
            <p className={theme === 'day-mode' ? 'text-gray-500' : 'text-gray-400'}>
              No code content available
            </p>
          </div>
        )}
        {parsedData?.explanation && (
          <div
            className={`p-4 rounded-lg ${
              theme === 'day-mode' ? 'bg-gray-50' : 'bg-[#334155]'
            }`}
          >
            <p
              className={`${
                theme === 'day-mode' ? 'text-gray-900' : 'text-gray-100'
              }`}
            >
              {parsedData.explanation}
            </p>
          </div>
        )}
      </div>
    );
  };

  const renderPresentationContent = contentData => {
    let parsedData = contentData;
    if (typeof contentData === 'string') {
      try {
        parsedData = JSON.parse(contentData);
      } catch (e) {
        parsedData = {};
      }
    }

    const presentationUrl = parsedData?.presentationUrl || parsedData?.googleSlidesUrl || parsedData?.fileUrl;
    const presentation = parsedData?.presentation;
    const gammaUrl = parsedData?.metadata?.gamma_raw_response?.result?.gammaUrl || 
                     parsedData?.metadata?.gamma_raw_response?.gammaUrl ||
                     parsedData?.gamma_raw_response?.result?.gammaUrl ||
                     parsedData?.gamma_raw_response?.gammaUrl ||
                     parsedData?.gammaUrl;

    const exportFormat = parsedData?.exportFormat || 
                         (presentationUrl?.toLowerCase().endsWith('.pdf') ? 'pdf' : null) ||
                         (presentationUrl?.toLowerCase().endsWith('.pptx') ? 'pptx' : null) ||
                         'pptx';
    const fileFormatLabel = exportFormat.toUpperCase();
    const fileFormatIcon = exportFormat === 'pdf' ? 'fa-file-pdf' : 'fa-file-powerpoint';

    return (
      <div
        className={`p-6 rounded-lg border-2 border-dashed ${
          theme === 'day-mode'
            ? 'bg-purple-50 border-purple-300'
            : 'bg-purple-900/20 border-purple-500/30'
        }`}
      >
        <div className="flex items-center justify-center mb-4">
          <i className={`fas ${fileFormatIcon} text-6xl ${exportFormat === 'pdf' ? 'text-red-600' : 'text-purple-600'}`}></i>
        </div>
        <div className="text-center space-y-2">
          <h3
            className={`text-lg font-semibold ${
              theme === 'day-mode' ? 'text-gray-900' : 'text-white'
            }`}
          >
            {presentation?.title || parsedData?.fileName || 'Presentation File'}
          </h3>
          {parsedData?.slide_count && (
            <p
              className={`text-sm ${
                theme === 'day-mode' ? 'text-gray-600' : 'text-gray-400'
              }`}
            >
              {parsedData.slide_count} slides
            </p>
          )}
          {(gammaUrl || presentationUrl) && (
            <div className="mt-4 space-y-3">
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                {gammaUrl && (
                  <a
                    href={gammaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    <i className="fas fa-external-link-alt mr-2"></i>
                    View Presentation
                  </a>
                )}
                {presentationUrl && (
                  <a
                    href={presentationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    download
                    className="inline-block px-6 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
                  >
                    <i className="fas fa-download mr-2"></i>
                    Download {fileFormatLabel}
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderAudioContent = contentData => {
    let parsedData = contentData;
    if (typeof contentData === 'string') {
      try {
        parsedData = JSON.parse(contentData);
      } catch (e) {
        parsedData = {};
      }
    }

    if (!parsedData?.audioUrl) {
      return (
        <div
          className={`p-4 rounded-lg ${
            theme === 'day-mode' ? 'bg-blue-50 border border-blue-200' : 'bg-blue-900/20 border border-blue-600/50'
          }`}
        >
          <p className={theme === 'day-mode' ? 'text-gray-500' : 'text-gray-400'}>
            No audio content available
          </p>
        </div>
      );
    }

    return (
      <div
        className={`p-4 rounded-lg ${
          theme === 'day-mode' ? 'bg-blue-50 border border-blue-200' : 'bg-blue-900/20 border border-blue-600/50'
        }`}
      >
        <h4
          className={`font-semibold mb-2 ${
            theme === 'day-mode' ? 'text-blue-900' : 'text-blue-200'
          }`}
        >
          Audio Narration
        </h4>
        <audio controls className="w-full">
          <source
            src={parsedData.audioUrl}
            type={`audio/${parsedData.audioFormat || 'mp3'}`}
          />
          Your browser does not support the audio element.
        </audio>
        {parsedData?.audioDuration && (
          <p
            className={`text-xs mt-2 ${
              theme === 'day-mode' ? 'text-blue-700' : 'text-blue-300'
            }`}
          >
            Duration: {Math.round(parsedData.audioDuration)}s
          </p>
        )}
        {parsedData?.audioVoice && (
          <p
            className={`text-xs mt-1 ${
              theme === 'day-mode' ? 'text-blue-700' : 'text-blue-300'
            }`}
          >
            Voice: {parsedData.audioVoice}
          </p>
        )}
      </div>
    );
  };

  const renderMindMapContent = contentData => {
    let parsedData = contentData;
    if (typeof contentData === 'string') {
      try {
        parsedData = JSON.parse(contentData);
      } catch (e) {
        parsedData = {};
      }
    }

    return (
      <div className="space-y-6">
        {parsedData?.nodes && parsedData?.edges ? (
          <div>
            <h4
              className={`font-semibold mb-4 text-lg ${
                theme === 'day-mode' ? 'text-gray-900' : 'text-white'
              }`}
            >
              <i className="fas fa-project-diagram mr-2 text-purple-600"></i>
              Mind Map Visualization
            </h4>
            <MindMapViewer data={parsedData} />
          </div>
        ) : (
          <div
            className={`p-4 rounded-lg ${
              theme === 'day-mode' ? 'bg-gray-50' : 'bg-[#334155]'
            }`}
          >
            <p className={theme === 'day-mode' ? 'text-gray-500' : 'text-gray-400'}>
              No mind map data available
            </p>
          </div>
        )}
        {parsedData?.imageUrl && (
          <div className="text-center">
            <img
              src={parsedData.imageUrl}
              alt="Mind Map"
              className="max-w-full h-auto rounded-lg shadow-lg mx-auto"
            />
          </div>
        )}
      </div>
    );
  };

  const renderAvatarVideoContent = contentItem => {
    // CRITICAL: renderAvatarVideoContent must extract data ONLY from contentItem.content_data
    // contentItem is the FULL object: { content_type: "avatar_video", content_data: {...} }
    
    if (!contentItem || typeof contentItem !== 'object') {
      console.warn('[AvatarVideo] contentItem is not an object:', contentItem);
      return (
        <div className={`p-4 rounded-lg ${theme === 'day-mode' ? 'bg-gray-50' : 'bg-[#334155]'}`}>
          <p className={theme === 'day-mode' ? 'text-gray-500' : 'text-gray-400'}>
            No video content available
          </p>
        </div>
      );
    }

    // Extract content_data ONLY from contentItem.content_data
    let contentData = contentItem.content_data;
    
    // If content_data is a JSON string, parse it
    if (typeof contentData === 'string') {
      try {
        contentData = JSON.parse(contentData);
      } catch (e) {
        console.warn('[AvatarVideo] Failed to parse content_data:', e);
        contentData = {};
      }
    }
    
    // Ensure contentData is an object
    if (!contentData || typeof contentData !== 'object') {
      console.warn('[AvatarVideo] content_data is not an object:', contentData);
      contentData = {};
    }

    // Priority for videoUrl resolution (EXACT ORDER AS SPECIFIED)
    // Extract ONLY from contentData (which is contentItem.content_data)
    const videoUrl = contentData?.videoUrl ||
                     contentData?.storageUrl ||
                     contentData?.metadata?.heygen_video_url ||
                     contentData?.heygen_video_url ||
                     contentData?.metadata?.heygenVideoUrl ||
                     contentData?.heygenVideoUrl ||
                     contentData?.fileUrl;  // fileUrl is checked after videoUrl in content_data

    // Extract videoId ONLY from contentData
    const videoId = contentData?.videoId;

    // Case A: videoUrl exists - Render HTML5 video
    if (videoUrl) {
      console.log('[AvatarVideo] Rendering video with URL:', videoUrl);
      return (
        <div className="bg-black rounded-lg overflow-hidden shadow-2xl aspect-video">
          <video
            src={videoUrl}
            controls
            className="w-full h-full"
            onError={(e) => {
              console.error('[AvatarVideo] Video load error:', e);
              console.error('[AvatarVideo] Video src:', videoUrl);
            }}
            onLoadStart={() => {
              console.log('[AvatarVideo] Video loading started');
            }}
          />
        </div>
      );
    }

    // Case B: No videoUrl but videoId exists - Render HeyGen link
    if (videoId) {
      return (
        <a
          href={`https://app.heygen.com/share/${videoId}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          Open avatar video
        </a>
      );
    }

    // Case C: Neither videoUrl nor videoId - Render fallback text with debug info
    console.warn('[AvatarVideo] No videoUrl or videoId found. ContentItem:', contentItem);
    console.warn('[AvatarVideo] ContentData:', contentData);
    return (
      <div
        className={`p-4 rounded-lg ${
          theme === 'day-mode' ? 'bg-gray-50' : 'bg-[#334155]'
        }`}
      >
        <p className={theme === 'day-mode' ? 'text-gray-500' : 'text-gray-400'}>
          No video content available
        </p>
        {/* Temporary debug display - remove after fixing */}
        {process.env.NODE_ENV === 'development' && (
          <pre className="text-xs mt-2 p-2 bg-gray-800 text-white rounded overflow-auto max-h-40">
            {JSON.stringify({ contentItem, contentData, videoUrl, videoId }, null, 2)}
          </pre>
        )}
      </div>
    );
  };

  const renderContentItem = (contentType, contentItem, index) => {
    // CRITICAL: renderContentItem must always receive the FULL content object:
    // { content_type, content_data } - never only content_data
    // Do NOT flatten or replace the content object before routing by content_type
    // Rendering must be decided ONLY by the data itself (contentItem.content_type), not by format_order
    
    // Ensure contentItem has the expected structure
    if (!contentItem || typeof contentItem !== 'object') {
      console.warn('[LessonContentView] contentItem is not an object:', contentItem);
      return null;
    }

    // Quick sanity check
    console.log('[Render]', contentItem.content_type, contentItem.content_data?.videoUrl || contentItem.content_data?.fileUrl);

    switch (contentType) {
      case 'text':
        // Extract content_data for text rendering
        let textContentData = contentItem.content_data || contentItem;
        if (typeof textContentData === 'string') {
          try {
            textContentData = JSON.parse(textContentData);
          } catch (e) {
            console.warn('Failed to parse text content_data:', e);
            textContentData = {};
          }
        }
        // MANDATORY: content_type "text" is Text + Audio combined
        // Always render both together in the same block
        return (
          <div key={`text-${index}`} className="space-y-4">
            {renderTextContent(textContentData, false)}
          </div>
        );
      case 'text_audio':
      case 'text_audio_combined':
        // Alias formats - treat same as "text" (display helpers only)
        let textAudioContentData = contentItem.content_data || contentItem;
        if (typeof textAudioContentData === 'string') {
          try {
            textAudioContentData = JSON.parse(textAudioContentData);
          } catch (e) {
            textAudioContentData = {};
          }
        }
        return (
          <div key={`text-${index}`} className="space-y-4">
            {renderTextContent(textAudioContentData, false)}
          </div>
        );
      case 'audio_text':
        // Alias format - audio first, then text (still combined block)
        let audioTextContentData = contentItem.content_data || contentItem;
        if (typeof audioTextContentData === 'string') {
          try {
            audioTextContentData = JSON.parse(audioTextContentData);
          } catch (e) {
            audioTextContentData = {};
          }
        }
        return (
          <div key={`audio-text-${index}`} className="space-y-4">
            {renderTextContent(audioTextContentData, true)}
          </div>
        );
      case 'code':
        let codeContentData = contentItem.content_data || contentItem;
        if (typeof codeContentData === 'string') {
          try {
            codeContentData = JSON.parse(codeContentData);
          } catch (e) {
            codeContentData = {};
          }
        }
        return (
          <div key={`code-${index}`}>
            {renderCodeContent(codeContentData)}
          </div>
        );
      case 'presentation':
        let presentationContentData = contentItem.content_data || contentItem;
        if (typeof presentationContentData === 'string') {
          try {
            presentationContentData = JSON.parse(presentationContentData);
          } catch (e) {
            presentationContentData = {};
          }
        }
        return (
          <div key={`presentation-${index}`}>
            {renderPresentationContent(presentationContentData)}
          </div>
        );
      case 'audio':
        let audioContentData = contentItem.content_data || contentItem;
        if (typeof audioContentData === 'string') {
          try {
            audioContentData = JSON.parse(audioContentData);
          } catch (e) {
            audioContentData = {};
          }
        }
        return (
          <div key={`audio-${index}`}>
            {renderAudioContent(audioContentData)}
          </div>
        );
      case 'mind_map':
        let mindMapContentData = contentItem.content_data || contentItem;
        if (typeof mindMapContentData === 'string') {
          try {
            mindMapContentData = JSON.parse(mindMapContentData);
          } catch (e) {
            mindMapContentData = {};
          }
        }
        return (
          <div key={`mindmap-${index}`}>
            {renderMindMapContent(mindMapContentData)}
          </div>
        );
      case 'avatar_video':
        console.log('🔥 we are in avatar vedio case 🔥');

        // CRITICAL: renderAvatarVideoContent must extract data ONLY from contentItem.content_data
        // Pass the FULL contentItem object, not just content_data
        return (
          <div key={`avatar-${index}`}>
            {renderAvatarVideoContent(contentItem)}
          </div>
        );
      default:
        // For unknown types, try to render as text if it has text field
        if (contentData && typeof contentData === 'object' && contentData.text) {
          return (
            <div key={`unknown-${index}`} className="space-y-4">
              {renderTextContent(contentData)}
            </div>
          );
        }
        // Otherwise show as JSON
        return (
          <pre
            key={`unknown-${index}`}
            className={`text-sm overflow-x-auto p-4 rounded-lg ${
              theme === 'day-mode' ? 'bg-gray-100 text-gray-700' : 'bg-gray-800 text-gray-200'
            }`}
          >
            {JSON.stringify(contentData, null, 2)}
          </pre>
        );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div>
          <p className={theme === 'day-mode' ? 'text-gray-600' : 'text-gray-300'}>
            Loading lesson content...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className={`text-center p-8 rounded-lg max-w-md ${
          theme === 'day-mode' ? 'bg-white' : 'bg-gray-800'
        }`}>
          <i className={`fas fa-exclamation-triangle text-4xl mb-4 ${
            theme === 'day-mode' ? 'text-red-500' : 'text-red-400'
          }`}></i>
          <h2 className={`text-xl font-semibold mb-2 ${
            theme === 'day-mode' ? 'text-gray-900' : 'text-white'
          }`}>
            Error Loading Lesson
          </h2>
          <p className={`mb-4 ${theme === 'day-mode' ? 'text-gray-600' : 'text-gray-400'}`}>
            {error}
          </p>
          <button
            onClick={() => navigate(`/course/${courseId}/overview`)}
            className={`px-4 py-2 rounded-lg ${
              theme === 'day-mode'
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'bg-emerald-500 hover:bg-emerald-600 text-white'
            }`}
          >
            Back to Course
          </button>
        </div>
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className={`text-center p-8 rounded-lg max-w-md ${
          theme === 'day-mode' ? 'bg-white' : 'bg-gray-800'
        }`}>
          <i className={`fas fa-info-circle text-4xl mb-4 ${
            theme === 'day-mode' ? 'text-blue-500' : 'text-blue-400'
          }`}></i>
          <h2 className={`text-xl font-semibold mb-2 ${
            theme === 'day-mode' ? 'text-gray-900' : 'text-white'
          }`}>
            Lesson Not Found
          </h2>
          <p className={`mb-4 ${theme === 'day-mode' ? 'text-gray-600' : 'text-gray-400'}`}>
            The requested lesson could not be found.
          </p>
          <button
            onClick={() => navigate(`/course/${courseId}/overview`)}
            className={`px-4 py-2 rounded-lg ${
              theme === 'day-mode'
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'bg-emerald-500 hover:bg-emerald-600 text-white'
            }`}
          >
            Back to Course
          </button>
        </div>
      </div>
    );
  }

  // ADAPTATION: Transform our backend data structure to component's expected format
  // Our backend provides: lesson.format_order (array) and lesson.content_data (array or object)
  // Component expects: formats array with type, display_order, and content array
  
  const formatOrder = Array.isArray(lesson.format_order) ? lesson.format_order : [];
  let contentData = lesson.content_data;
  
  // Handle case where content_data is an object (not array) - convert to array format
  if (contentData && !Array.isArray(contentData)) {
    // If lesson has content_type at lesson level, create a content item
    if (lesson.content_type) {
      contentData = [{
        content_type: lesson.content_type,
        content_data: contentData
      }];
    } else {
      contentData = [contentData];
    }
  } else if (!Array.isArray(contentData)) {
    contentData = [];
  }

  // DEBUG: Log contentData BEFORE building formats
  console.log('FORMAT ORDER:', formatOrder);
  console.log('CONTENT DATA ARRAY:', contentData);
  contentData.forEach((item, i) => {
    console.log(
      `CONTENT ITEM ${i}:`,
      item,
      'content_type =',
      item?.content_type
    );
  });

  // Build formats array by iterating over format_order
  const formats = formatOrder.map((formatType, index) => {
    // DEBUG: Log matchingContent for avatar_video ONLY
    if (formatType === 'avatar_video') {
      console.log(
        'AVATAR FILTER CHECK:',
        contentData.map(i => i?.content_type)
      );
    }
    
    // Filter content_data items that match this format type
    // CRITICAL: Matching must be done using item.content_type === formatType (not type, format, or any other field)
    const matchingContent = contentData.filter(item => {
      // Use ONLY content_type for matching
      const itemContentType = item.content_type;
      
      if (!itemContentType) {
        return false;
      }
      
      // MANDATORY: content_type "text" is Text + Audio combined
      // Alias formats (text_audio, audio_text, text_audio_combined) are display helpers only
      // They all map to the same "text" content_type in the data
      if (formatType === 'text' || formatType === 'text_audio' || formatType === 'text_audio_combined' || formatType === 'audio_text') {
        // All these format types expect content_type === "text" in the data
        return itemContentType === 'text';
      }
      
      // For other formats, match exactly using content_type
      return itemContentType === formatType;
    });
    
    // DEBUG: Log matchingContent for avatar_video ONLY
    if (formatType === 'avatar_video') {
      console.log('AVATAR MATCHING CONTENT:', matchingContent);
    }

    return {
      type: formatType,
      display_order: index,
      // CRITICAL: Pass the FULL content object, not just content_data
      // Do NOT flatten or replace the content object before routing by content_type
      content: matchingContent.map((item, itemIndex) => ({
        content_id: item.id || `content-${index}-${itemIndex}`,
        content_type: item.content_type,  // Keep content_type
        content_data: item.content_data    // Keep content_data
      }))
    };
  });
  
  // If no formats found but lesson has content_type and content_data, add it
  if (formats.length === 0 && lesson.content_type && lesson.content_data) {
    formats.push({
      type: lesson.content_type,
      display_order: 0,
      content: [{
        content_id: `content-0-0`,
        content_data: lesson.content_data
      }]
    });
  }

  return (
    <div className={`min-h-screen ${theme === 'day-mode' ? 'bg-gray-50' : 'bg-[#1e293b]'}`}>
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate(`/course/${courseId}/overview`)}
            className={`mb-4 flex items-center gap-2 ${
              theme === 'day-mode' ? 'text-gray-600 hover:text-gray-900' : 'text-gray-300 hover:text-white'
            }`}
          >
            <i className="fas fa-arrow-left"></i>
            Back to Course
          </button>

          <h1
            className="text-4xl font-bold mb-2"
            style={{
              background: 'var(--gradient-primary)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            {lesson.lesson_name || 'Lesson'}
          </h1>
          {lesson.lesson_description && (
            <p className={theme === 'day-mode' ? 'text-gray-600' : 'text-gray-400'}>
              {lesson.lesson_description}
            </p>
          )}
        </div>

        {/* Lesson Content by Format Order */}
        <div className="space-y-8">
          {formats.map((formatItem, index) => {
            const displayType = formatItem.type === 'text_audio_combined' || formatItem.type === 'audio_text' 
              ? 'text' 
              : formatItem.type;
            const displayLabel = formatLabels[displayType] || formatItem.type;
            const displayIcon = formatIcons[displayType] || 'fa-file';
            
            return (
              <div
                key={`${formatItem.type}-${index}`}
                className={`p-6 rounded-lg ${
                  theme === 'day-mode'
                    ? 'bg-white border border-gray-200 shadow-sm'
                    : 'bg-gray-800 border border-gray-700 shadow-lg'
                }`}
              >
                {/* Format Header */}
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      theme === 'day-mode'
                        ? 'bg-emerald-100 text-emerald-600'
                        : 'bg-emerald-900/30 text-emerald-400'
                    }`}
                  >
                    <i className={`fas ${displayIcon}`}></i>
                  </div>
                  <div>
                    <h3 className={`text-lg font-semibold ${
                      theme === 'day-mode' ? 'text-gray-900' : 'text-white'
                    }`}>
                      {displayLabel}
                    </h3>
                    <p className={`text-sm ${
                      theme === 'day-mode' ? 'text-gray-500' : 'text-gray-400'
                    }`}>
                      Step {formatItem.display_order + 1} of {formats.length}
                    </p>
                  </div>
                </div>

                {/* Content Items */}
                {formatItem.content && formatItem.content.length > 0 ? (
                  <div>
                    {formatItem.content.map((contentItem, itemIndex) =>
                      renderContentItem(
                        contentItem.content_type, // 🔥 USE REAL DATA TYPE, not formatItem.type
                        contentItem,
                        itemIndex
                      )
                    )}
                  </div>
                ) : (
                  <div className={`text-center py-8 ${
                    theme === 'day-mode' ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    <i className={`fas ${displayIcon} text-3xl mb-2`}></i>
                    <p>No {displayLabel} content available</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

