import React, { useState, useEffect, useRef } from 'react';

export default function MemeGenerator() {
    const [memes, setMemes] = useState([]);
    const [selectedMeme, setSelectedMeme] = useState(null);
    const [topText, setTopText] = useState('');
    const [bottomText, setBottomText] = useState('');
    const [uploadedImage, setUploadedImage] = useState(null);
    const [topTextStyle, setTopTextStyle] = useState({ color: '#ffffff', fontSize: 30, font: 'Impact' });
    const [bottomTextStyle, setBottomTextStyle] = useState({ color: '#ffffff', fontSize: 30, font: 'Impact' });
    const [topTextPos, setTopTextPos] = useState({ x: 50, y: 10 });
    const [bottomTextPos, setBottomTextPos] = useState({ x: 50, y: 90 });
    const [imageSize, setImageSize] = useState({ width: 500, height: 0, maintainAspect: true });
    const [error, setError] = useState('');
    const [dragging, setDragging] = useState(null);
    const canvasRef = useRef(null);

    const fontOptions = ['Impact', 'Arial', 'Comic Sans MS', 'Times New Roman', 'Verdana'];

    useEffect(() => {
        fetch('https://api.imgflip.com/get_memes')
            .then(res => res.json())
            .then(data => setMemes(data.data.memes.slice(0, 9)))
            .catch(() => setError('Failed to load meme templates.'));
    }, []);

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setUploadedImage(reader.result);
                setSelectedMeme(null);
                setError('');
                const img = new Image();
                img.src = reader.result;
                img.onload = () => {
                    setImageSize(prev => ({
                        ...prev,
                        height: prev.maintainAspect ? (img.height * prev.width) / img.width : img.height
                    }));
                };
            };
            reader.readAsDataURL(file);
        } else {
            setError('Please upload a valid image file.');
        }
    };

    const handleImageSizeChange = (e, dimension) => {
        const value = Number(e.target.value);
        if (dimension === 'width') {
            setImageSize(prev => ({
                ...prev,
                width: Math.max(100, Math.min(value, 1000)),
                height: prev.maintainAspect && (selectedMeme || uploadedImage)
                    ? (prev.height * Math.max(100, Math.min(value, 1000))) / prev.width
                    : prev.height
            }));
        } else {
            setImageSize(prev => ({
                ...prev,
                height: Math.max(100, Math.min(value, 1000))
            }));
        }
    };

    const drawMeme = () => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = uploadedImage || selectedMeme?.url || 'https://i.imgflip.com/1bij.jpg';

        img.onload = () => {
            let width = imageSize.width;
            let height = imageSize.height || img.height;
            if (imageSize.maintainAspect && !imageSize.height) {
                height = (img.height * width) / img.width;
            }

            canvas.width = width;
            canvas.height = height;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, width, height);

            ctx.font = `bold ${topTextStyle.fontSize}px ${topTextStyle.font}`;
            ctx.fillStyle = topTextStyle.color;
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 2;
            ctx.textAlign = 'center';
            if (topText) {
                ctx.fillText(topText.toUpperCase(), topTextPos.x * width / 100, topTextPos.y * height / 100);
                ctx.strokeText(topText.toUpperCase(), topTextPos.x * width / 100, topTextPos.y * height / 100);
            }

            ctx.font = `bold ${bottomTextStyle.fontSize}px ${bottomTextStyle.font}`;
            ctx.fillStyle = bottomTextStyle.color;
            if (bottomText) {
                ctx.fillText(bottomText.toUpperCase(), bottomTextPos.x * width / 100, bottomTextPos.y * height / 100);
                ctx.strokeText(bottomText.toUpperCase(), bottomTextPos.x * width / 100, bottomTextPos.y * height / 100);
            }
        };

        img.onerror = () => {
            setError('Failed to load image. Using default.');
            img.src = 'https://i.imgflip.com/1bij.jpg';
        };
    };

    useEffect(() => {
        if (topText || bottomText || selectedMeme || uploadedImage) {
            drawMeme();
        } else {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
    }, [topText, bottomText, selectedMeme, uploadedImage, topTextStyle, bottomTextStyle, topTextPos, bottomTextPos, imageSize]);

    const handleStart = (e) => {
        e.preventDefault();
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const clientX = e.clientX || (e.touches && e.touches[0]?.clientX);
        const clientY = e.clientY || (e.touches && e.touches[0]?.clientY);
        if (!clientX || !clientY) return;

        const x = ((clientX - rect.left) / rect.width) * 100;
        const y = ((clientY - rect.top) / rect.height) * 100;

        const ctx = canvas.getContext('2d');
        ctx.font = `bold ${topTextStyle.fontSize}px ${topTextStyle.font}`;
        const topTextMetrics = ctx.measureText(topText.toUpperCase());
        const topTextWidth = topTextMetrics.width / (canvas.width / 100);
        const topTextHeight = topTextStyle.fontSize / (canvas.height / 100);
        ctx.font = `bold ${bottomTextStyle.fontSize}px ${bottomTextStyle.font}`;
        const bottomTextMetrics = ctx.measureText(bottomText.toUpperCase());
        const bottomTextWidth = bottomTextMetrics.width / (canvas.width / 100);
        const bottomTextHeight = bottomTextStyle.fontSize / (canvas.height / 100);

        if (
            topText &&
            Math.abs(x - topTextPos.x) < topTextWidth / 2 &&
            Math.abs(y - topTextPos.y) < topTextHeight
        ) {
            setDragging('top');
        }
        else if (
            bottomText &&
            Math.abs(x - bottomTextPos.x) < bottomTextWidth / 2 &&
            Math.abs(y - bottomTextPos.y) < bottomTextHeight
        ) {
            setDragging('bottom');
        }
    };

    const handleMove = (e) => {
        e.preventDefault();
        if (dragging) {
            const canvas = canvasRef.current;
            const rect = canvas.getBoundingClientRect();
            const clientX = e.clientX || (e.touches && e.touches[0]?.clientX);
            const clientY = e.clientY || (e.touches && e.touches[0]?.clientY);
            if (!clientX || !clientY) return;

            const x = ((clientX - rect.left) / rect.width) * 100;
            const y = ((clientY - rect.top) / rect.height) * 100;
            const newPos = { x: Math.max(0, Math.min(x, 100)), y: Math.max(0, Math.min(y, 100)) };
            if (dragging === 'top') {
                setTopTextPos(newPos);
            } else if (dragging === 'bottom') {
                setBottomTextPos(newPos);
            }
        }
    };

    const handleEnd = (e) => {
        e.preventDefault();
        setDragging(null);
    };

    const downloadMeme = () => {
        const canvas = canvasRef.current;
        const link = document.createElement('a');
        link.download = 'custom-meme.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
    };

    const clearMeme = () => {
        setUploadedImage(null);
        setSelectedMeme(null);
        setTopText('');
        setBottomText('');
        setTopTextStyle({ color: '#ffffff', fontSize: 30, font: 'Impact' });
        setBottomTextStyle({ color: '#ffffff', fontSize: 30, font: 'Impact' });
        setTopTextPos({ x: 50, y: 10 });
        setBottomTextPos({ x: 50, y: 90 });
        setImageSize({ width: 500, height: 0, maintainAspect: true });
        setError('');
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    };

    return (
        <div className="container">
            <h1>Meme Generator</h1>
            <div className="meme-editor">
                <div className="controls">
                    <div className="form-group">
                        <label>Top Text</label>
                        <input
                            type="text"
                            placeholder="Top Text"
                            value={topText}
                            onChange={(e) => setTopText(e.target.value)}
                        />
                    </div>
                    <div className="form-group">
                        <label>Top Text Color</label>
                        <input
                            type="color"
                            value={topTextStyle.color}
                            onChange={(e) => setTopTextStyle({ ...topTextStyle, color: e.target.value })}
                        />
                    </div>
                    <div className="form-group">
                        <label>Top Text Size (px)</label>
                        <input
                            type="number"
                            value={topTextStyle.fontSize}
                            onChange={(e) => setTopTextStyle({ ...topTextStyle, fontSize: Number(e.target.value) })}
                            min="10"
                            max="100"
                        />
                    </div>
                    <div className="form-group">
                        <label>Top Text Font</label>
                        <select
                            value={topTextStyle.font}
                            onChange={(e) => setTopTextStyle({ ...topTextStyle, font: e.target.value })}
                        >
                            {fontOptions.map(font => (
                                <option key={font} value={font}>{font}</option>
                            ))}
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Bottom Text</label>
                        <input
                            type="text"
                            placeholder="Bottom Text"
                            value={bottomText}
                            onChange={(e) => setBottomText(e.target.value)}
                        />
                    </div>
                    <div className="form-group">
                        <label>Bottom Text Color</label>
                        <input
                            type="color"
                            value={bottomTextStyle.color}
                            onChange={(e) => setBottomTextStyle({ ...bottomTextStyle, color: e.target.value })}
                        />
                    </div>
                    <div className="form-group">
                        <label>Bottom Text Size (px)</label>
                        <input
                            type="number"
                            value={bottomTextStyle.fontSize}
                            onChange={(e) => setBottomTextStyle({ ...bottomTextStyle, fontSize: Number(e.target.value) })}
                            min="10"
                            max="100"
                        />
                    </div>
                    <div className="form-group">
                        <label>Bottom Text Font</label>
                        <select
                            value={bottomTextStyle.font}
                            onChange={(e) => setBottomTextStyle({ ...bottomTextStyle, font: e.target.value })}
                        >
                            {fontOptions.map(font => (
                                <option key={font} value={font}>{font}</option>
                            ))}
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Image Width (px)</label>
                        <input
                            type="number"
                            value={imageSize.width}
                            onChange={(e) => handleImageSizeChange(e, 'width')}
                            min="100"
                            max="1000"
                        />
                    </div>
                    <div className="form-group">
                        <label>Image Height (px)</label>
                        <input
                            type="number"
                            value={imageSize.height}
                            onChange={(e) => handleImageSizeChange(e, 'height')}
                            min="100"
                            max="1000"
                            disabled={imageSize.maintainAspect}
                        />
                    </div>
                    <div className="form-group">
                        <label>
                            <input
                                type="checkbox"
                                checked={imageSize.maintainAspect}
                                onChange={(e) => setImageSize({ ...imageSize, maintainAspect: e.target.checked })}
                            />
                            Maintain Aspect Ratio
                        </label>
                    </div>
                    <div className="form-group">
                        <label>Upload Image</label>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                        />
                    </div>
                    <div className="form-group">
                        <label>Select Template</label>
                        <div className="templates">
                            {memes.map((meme) => (
                                <img
                                    key={meme.id}
                                    src={meme.url}
                                    alt={meme.name}
                                    className="template-image"
                                    onClick={() => {
                                        setSelectedMeme(meme);
                                        setImageSize(prev => ({
                                            ...prev,
                                            height: prev.maintainAspect ? (meme.height * prev.width) / meme.width : prev.height
                                        }));
                                    }}
                                />
                            ))}
                        </div>
                    </div>
                    <div className="buttons">
                        <button onClick={downloadMeme}>Download Meme</button>
                        <button onClick={clearMeme}>Clear</button>
                    </div>
                    {error && <div className="error">{error}</div>}
                </div>
                <div className="canvas-container">
                    <canvas
                        ref={canvasRef}
                        onMouseDown={handleStart}
                        onMouseMove={handleMove}
                        onMouseUp={handleEnd}
                        onTouchStart={handleStart}
                        onTouchMove={handleMove}
                        onTouchEnd={handleEnd}
                    ></canvas>
                </div>
            </div>
        </div>
    );
}