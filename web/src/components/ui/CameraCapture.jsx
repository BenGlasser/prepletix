import React, { useState, useRef, useCallback, useEffect } from 'react';
import { XMarkIcon, CameraIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

export default function CameraCapture({ isOpen, onClose, onCapture }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [facingMode, setFacingMode] = useState('user'); // Start with front camera as it's more reliable
  const [videoReady, setVideoReady] = useState(false);

  const startCamera = useCallback(async () => {
    console.log('=== Starting camera ===');
    setIsLoading(true);
    setError('');
    setVideoReady(false);
    
    try {
      // Stop existing stream if any
      if (streamRef.current) {
        console.log('Stopping existing stream');
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }

      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera is not supported in this browser');
      }

      console.log('Requesting camera access...');
      
      // Try basic constraints first
      let constraints = { video: true, audio: false };
      let newStream;
      
      try {
        newStream = await navigator.mediaDevices.getUserMedia(constraints);
        console.log('✓ Camera stream obtained with basic constraints');
      } catch {
        console.log('Basic constraints failed, trying with facingMode:', facingMode);
        constraints = {
          video: { facingMode },
          audio: false
        };
        newStream = await navigator.mediaDevices.getUserMedia(constraints);
        console.log('✓ Camera stream obtained with facingMode');
      }
      
      streamRef.current = newStream;
      setStream(newStream);
      
      // Wait for video element to be available if needed
      const setupVideo = async () => {
        let attempts = 0;
        const maxAttempts = 10;
        
        while (!videoRef.current && attempts < maxAttempts) {
          console.log(`Waiting for video ref, attempt ${attempts + 1}/${maxAttempts}`);
          await new Promise(resolve => setTimeout(resolve, 100));
          attempts++;
        }
        
        if (videoRef.current) {
          console.log('✓ Video ref found, setting up video...');
          videoRef.current.srcObject = newStream;
          
          // Set up event handlers
          videoRef.current.onloadedmetadata = () => {
            console.log('✓ Video metadata loaded, dimensions:', videoRef.current.videoWidth, 'x', videoRef.current.videoHeight);
            if (videoRef.current.videoWidth > 0 && videoRef.current.videoHeight > 0) {
              setVideoReady(true);
              setIsLoading(false);
              console.log('✓ Video ready for capture');
            }
          };
          
          videoRef.current.oncanplay = () => {
            console.log('✓ Video can play');
            if (videoRef.current.videoWidth > 0 && videoRef.current.videoHeight > 0) {
              setVideoReady(true);
              setIsLoading(false);
            }
          };
          
          // Try to play the video
          try {
            await videoRef.current.play();
            console.log('✓ Video playing');
          } catch (playError) {
            console.log('Video autoplay failed (this is normal):', playError.message);
          }
        } else {
          console.log('❌ Video ref still not available after waiting');
          setError('Video element not ready. Please try again.');
          setIsLoading(false);
        }
      };
      
      await setupVideo();
      
      // Fallback timeout
      setTimeout(() => {
        if (isLoading && streamRef.current) {
          console.log('Timeout reached, assuming video is ready');
          setVideoReady(true);
          setIsLoading(false);
        }
      }, 5000);

    } catch (error) {
      console.error('❌ Camera error:', error);
      let errorMessage = 'Unable to access camera. ';
      
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        errorMessage += 'Please allow camera access and reload the page.';
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        errorMessage += 'No camera found on this device.';
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        errorMessage += 'Camera is being used by another application.';
      } else {
        errorMessage += error.message || 'Please check your camera permissions.';
      }
      
      setError(errorMessage);
      setIsLoading(false);
    }
  }, [facingMode, isLoading]);

  const stopCamera = useCallback(() => {
    console.log('stopCamera called, streamRef.current:', streamRef.current);
    
    // Stop the stream from ref (most reliable)
    if (streamRef.current) {
      console.log('Stopping camera stream from ref');
      streamRef.current.getTracks().forEach(track => {
        console.log('Stopping track:', track.kind, track.label, track.readyState);
        track.stop();
        console.log('Track stopped, new state:', track.readyState);
      });
      streamRef.current = null;
      setStream(null);
      setVideoReady(false);
    }
    
    // Also stop any stream directly from video element as fallback
    if (videoRef.current && videoRef.current.srcObject) {
      console.log('Stopping stream from video element');
      const videoStream = videoRef.current.srcObject;
      if (videoStream && videoStream.getTracks) {
        videoStream.getTracks().forEach(track => {
          console.log('Stopping video track:', track.kind, track.readyState);
          track.stop();
        });
      }
      videoRef.current.srcObject = null;
      setVideoReady(false);
    }
  }, []);

  const handleClose = useCallback(() => {
    // Ensure camera is properly stopped
    stopCamera();
    setError('');
    setIsLoading(false);
    onClose();
  }, [stopCamera, onClose]);

  const handleCapture = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) {
      console.log('Cannot capture: missing video or canvas ref');
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    // Check if video has valid dimensions
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      console.log('Cannot capture: video dimensions are 0');
      setError('Camera not ready. Please try again.');
      return;
    }

    console.log('Capturing photo, video dimensions:', video.videoWidth, 'x', video.videoHeight);
    
    const context = canvas.getContext('2d');

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw the video frame to canvas
    context.drawImage(video, 0, 0);

    // Convert canvas to blob
    canvas.toBlob((blob) => {
      if (blob) {
        console.log('Photo captured successfully, blob size:', blob.size);
        onCapture(blob);
        // Camera will be stopped when component closes
        handleClose();
      } else {
        console.log('Failed to create photo blob');
        setError('Failed to capture photo. Please try again.');
      }
    }, 'image/jpeg', 0.8);
  }, [onCapture, handleClose]);

  const switchCamera = useCallback(() => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  }, []);

  // Start camera when component opens or facing mode changes
  useEffect(() => {
    if (isOpen) {
      console.log('Starting camera, facing mode:', facingMode);
      startCamera();
    }

    return () => {
      // Cleanup function to ensure camera is always stopped
      console.log('useEffect cleanup running, streamRef.current:', streamRef.current);
      
      // Stop any current stream from ref
      if (streamRef.current) {
        console.log('Cleanup: stopping camera stream from ref');
        streamRef.current.getTracks().forEach(track => {
          console.log('Cleanup stopping track:', track.kind, track.readyState);
          track.stop();
        });
        streamRef.current = null;
      }
      
      // Reset state
      setVideoReady(false);
      setStream(null);
      setError('');
      
      // Copy ref to variable to avoid stale closure
      // eslint-disable-next-line react-hooks/exhaustive-deps
      const videoElement = videoRef.current;
      if (videoElement && videoElement.srcObject) {
        console.log('Cleanup: stopping stream from video element');
        const videoStream = videoElement.srcObject;
        if (videoStream && videoStream.getTracks) {
          videoStream.getTracks().forEach(track => {
            console.log('Cleanup stopping video track:', track.kind, track.readyState);
            track.stop();
          });
        }
        videoElement.srcObject = null;
      }
    };
  }, [isOpen, facingMode, startCamera]);

  // Additional cleanup on unmount - this is critical
  useEffect(() => {
    return () => {
      console.log('CameraCapture component unmounting - force cleanup');
      
      // Force stop any remaining streams
      if (streamRef.current) {
        console.log('Force cleanup: stopping stream from ref');
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      
      // Copy ref to variable to avoid stale closure
      // eslint-disable-next-line react-hooks/exhaustive-deps
      const videoElement = videoRef.current;
      if (videoElement && videoElement.srcObject) {
        console.log('Force cleanup: stopping stream from video');
        const videoStream = videoElement.srcObject;
        if (videoStream && videoStream.getTracks) {
          videoStream.getTracks().forEach(track => track.stop());
        }
        videoElement.srcObject = null;
      }
    };
  }, []);

  // Additional cleanup when component closes
  useEffect(() => {
    if (!isOpen) {
      // Ensure video element is cleared when modal closes
      if (videoRef.current) {
        console.log('Modal closed, clearing video element');
        videoRef.current.srcObject = null;
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90">
      <div className="relative w-full h-full max-w-2xl max-h-[90vh] bg-black rounded-lg overflow-hidden">
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/60 to-transparent p-4">
          <div className="flex justify-between items-center">
            <button
              onClick={handleClose}
              className="text-white hover:text-gray-300 transition-colors p-2 rounded-full hover:bg-white/10"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
            <h3 className="text-white font-medium">Take Profile Photo</h3>
            <button
              onClick={switchCamera}
              className="text-white hover:text-gray-300 transition-colors p-2 rounded-full hover:bg-white/10"
              title="Switch Camera"
            >
              <ArrowPathIcon className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Video Stream - Always render video element */}
        <div className="relative w-full h-full flex items-center justify-center">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
          
          {/* Overlays */}
          {error && (
            <div className="absolute inset-0 bg-black/80 flex items-center justify-center text-center text-white p-6">
              <div>
                <p className="mb-4">{error}</p>
                <button
                  onClick={startCamera}
                  className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
                >
                  Try Again
                </button>
              </div>
            </div>
          )}
          
          {isLoading && (
            <div className="absolute inset-0 bg-black/80 flex items-center justify-center text-center text-white">
              <div>
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                <p>Starting camera...</p>
                {stream && (
                  <p className="text-sm mt-2">Stream active, waiting for video...</p>
                )}
              </div>
            </div>
          )}
          
          {/* Debug overlay */}
          {stream && !videoReady && !isLoading && !error && (
            <div className="absolute top-4 left-4 bg-yellow-600/70 text-white px-3 py-2 rounded text-sm">
              Stream active, video loading...
            </div>
          )}
          
          {videoReady && (
            <div className="absolute top-4 left-4 bg-green-600/70 text-white px-3 py-2 rounded text-sm">
              ✓ Ready to capture
            </div>
          )}
        </div>

        {/* Capture Button */}
        {stream && videoReady && !error && !isLoading && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-6">
            <div className="flex justify-center">
              <button
                onClick={handleCapture}
                className="bg-white text-black w-16 h-16 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors shadow-lg"
                title="Capture Photo"
              >
                <CameraIcon className="w-8 h-8" />
              </button>
            </div>
          </div>
        )}

        {/* Fallback capture button if video fails to load but stream exists */}
        {stream && !videoReady && !isLoading && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-6">
            <div className="flex justify-center space-x-4">
              <button
                onClick={handleCapture}
                className="bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 transition-colors"
                title="Capture Photo"
              >
                <CameraIcon className="w-6 h-6 inline mr-2" />
                Take Photo
              </button>
            </div>
          </div>
        )}

        {/* Hidden canvas for capturing */}
        <canvas
          ref={canvasRef}
          className="hidden"
        />
      </div>
    </div>
  );
}