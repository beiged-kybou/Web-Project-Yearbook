
document.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const previewContainer = document.getElementById('preview-container');
    const photoCountDisplay = document.getElementById('photo-count');

    // Drag and Drop Events
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('drag-over');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('drag-over');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        handleFiles(e.dataTransfer.files);
    });

    dropZone.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', (e) => {
        handleFiles(e.target.files);
    });

    function handleFiles(files) {
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
        let count = 0;

        Array.from(files).forEach(file => {
            if (!validTypes.includes(file.type)) {
                alert(`File ${file.name} is not a supported image type (JPEG, JPG, PNG only).`);
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                createPreviewCard(file, e.target.result);
                updateCount();
            };
            reader.readAsDataURL(file);
            count++;
        });
    }

    function createPreviewCard(file, imgSrc) {
        const card = document.createElement('div');
        card.className = 'photo-preview-card';

        card.innerHTML = `
            <div class="preview-image" style="background-image: url('${imgSrc}')"></div>
            <div class="preview-details">
                <p class="file-name">${file.name}</p>
                <textarea 
                    placeholder="Add a description (max 80 words)..." 
                    maxlength="500"
                    oninput="checkWordCount(this)"
                ></textarea>
                <div class="word-count">0/80 words</div>
                <button type="button" class="remove-btn" onclick="this.closest('.photo-preview-card').remove(); updateCount();">Remove</button>
            </div>
        `;

        previewContainer.appendChild(card);
    }

    window.checkWordCount = function (textarea) {
        const words = textarea.value.trim().split(/\s+/).filter(w => w.length > 0).length;
        const display = textarea.nextElementSibling;

        if (words > 80) {
            display.style.color = 'var(--color-error)';
            textarea.style.borderColor = 'var(--color-error)';
        } else {
            display.style.color = 'var(--color-text-muted)';
            textarea.style.borderColor = 'var(--color-border)';
        }
        display.innerText = `${words}/80 words`;
    }

    window.updateCount = function () {
        const count = previewContainer.children.length;
        if (photoCountDisplay) {
            photoCountDisplay.innerText = `${count} photos selected`;
        }
    }
});
