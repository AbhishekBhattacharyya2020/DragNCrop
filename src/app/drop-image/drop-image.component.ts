import { Component, OnInit, ViewEncapsulation } from "@angular/core";
interface Evnt {
  preventDefault: () => void;
  stopPropagation: () => void;
  target: EventTarget;
  clientX: number;
  clientY: number;
}
@Component({
  selector: "app-drop-image",
  templateUrl: "./drop-image.component.html",
  styleUrls: ["./drop-image.component.css"],
  encapsulation: ViewEncapsulation.None,
})
export class DropImageComponent implements OnInit {
  constructor() {}
  addEventHandler = (obj: any, eventName: string, handler: any): void => {
    if (obj.addEventListener) {
      obj.addEventListener(eventName, handler, false);
    } else if (obj.attachEvent) {
      obj.attachEvent("on" + eventName, handler);
    } else {
      obj["on" + eventName] = handler;
    }
  };

  resizeAndCrop = (image: any): void => {
    let container: any;
    let orig_src = new Image();
    let image_target = image;
    let event_state: {
      evnt: Evnt;
      container_left: number;
      container_top: number;
      container_width: number;
      container_height: number;
      mouse_pos_x: number;
      mouse_pos_y: number;
    } = {
      evnt: {
        preventDefault: Function,
        stopPropagation: Function,
        target: new EventTarget(),
        clientX: 0,
        clientY: 0,
      },
      container_left: 0,
      container_top: 0,
      container_width: 0,
      container_height: 0,
      mouse_pos_x: 0,
      mouse_pos_y: 0,
    };
    let constrain = false;
    let max_height = 900;
    let min_height = 60;
    let max_width = 800;
    let min_width = 60;
    let resize_canvas = document.createElement("canvas");

    const init = () => {
      // Keeping this copy of the original as the base, to use while re-sizing
      orig_src.src = image_target.src;

      // Wrapping the image with the container and add resize handles
      const wrapper = document.createElement("div");
      wrapper.classList.add("resize-container");

      image_target.parentNode.insertBefore(wrapper, image_target);
      const createImageHandle = (direction: string) => {
        const handleElem = document.createElement("span");
        const classString = "resize-handle-" + direction;
        handleElem.classList.add("resize-handle");
        handleElem.classList.add(classString);
        return handleElem;
      };

      //Adding the handles
      wrapper.appendChild(image_target);
      image_target.before(createImageHandle("nw"));
      image_target.before(createImageHandle("ne"));
      image_target.after(createImageHandle("se"));
      image_target.after(createImageHandle("sw"));

      // Assigning the container to a variable
      container = wrapper;
      let crop_btn = document.querySelector(".crop_btn");
      let clr_btn = document.querySelector(".refresh_btn");
      // Adding events
      container.addEventListener("mousedown", startResize);
      container.addEventListener("mousedown", startMoving);
      crop_btn !== null ? crop_btn.addEventListener("click", crop) : null;
      clr_btn !== null ? clr_btn.addEventListener("click", clear) : null;
    };

    const startResize = (e: any) => {
      e.preventDefault();
      e.stopPropagation();
      saveEventState(e);
      document.addEventListener("mousemove", resizing);
      document.addEventListener("mouseup", endResize);
    };

    const endResize = (e: { preventDefault: () => void }) => {
      e.preventDefault();
      document.removeEventListener("mouseup", endResize);
      document.removeEventListener("mousemove", resizing);
    };

    const resizing = (e: { clientX: any; clientY: any; shiftKey: any }) => {
      let mouse = { x: e.clientX, y: e.clientY },
        width,
        height,
        left,
        top,
        offset = { top: container.offsetTop, left: container.offsetLeft };
      mouse.x = e.clientX;
      mouse.y = e.clientY;

      // Position image depending on the corner dragged and constraints
      let evnt_target: any = event_state.evnt.target;
      if (evnt_target?.classList.contains("resize-handle-se")) {
        width = mouse.x - event_state.container_left;
        height = mouse.y - event_state.container_top;
        left = event_state.container_left;
        top = event_state.container_top;
      } else if (evnt_target?.classList.contains("resize-handle-sw")) {
        width =
          event_state.container_width - (mouse.x - event_state.container_left);
        height = mouse.y - event_state.container_top;
        left = mouse.x;
        top = event_state.container_top;
      } else if (evnt_target?.classList.contains("resize-handle-nw")) {
        width =
          event_state.container_width - (mouse.x - event_state.container_left);
        height =
          event_state.container_height - (mouse.y - event_state.container_top);
        left = mouse.x;
        top = mouse.y;
        if (constrain || e.shiftKey) {
          top = mouse.y - ((width / orig_src.width) * orig_src.height - height);
        }
      } else if (evnt_target?.classList.contains("resize-handle-ne")) {
        width = mouse.x - event_state.container_left;
        height =
          event_state.container_height - (mouse.y - event_state.container_top);
        left = event_state.container_left;
        top = mouse.y;
        if (constrain || e.shiftKey) {
          top = mouse.y - ((width / orig_src.width) * orig_src.height - height);
        }
      }

      // Maintain aspect ratio
      if ((constrain || e.shiftKey) && width !== undefined) {
        height = (width / orig_src.width) * orig_src.height;
      }
      if (
        width !== undefined &&
        height !== undefined &&
        width > min_width &&
        height > min_height &&
        width < max_width &&
        height < max_height
      ) {
        // THIS COULD BE CALLED WITH RxJS Throttle
        resizeImage(width, height);
        container.offset = { left: left, top: top };
      }
    };

    const saveEventState = (e: Evnt) => {
      // Save the initial event details and container state
      event_state.container_width = container.offsetWidth;
      event_state.container_height = container.offsetHeight;
      event_state.container_left = container.offsetLeft;
      event_state.container_top = container.offsetTop;
      event_state.mouse_pos_x = e.clientX;
      event_state.mouse_pos_y = e.clientY;
      event_state.evnt = e;
    };

    const resizeImage = (width: number, height: number) => {
      resize_canvas.width = width;
      resize_canvas.height = height;
      let contextFor2d = resize_canvas.getContext("2d");
      if (contextFor2d !== null) {
        contextFor2d.drawImage(orig_src, 0, 0, width, height);
      }
      image_target.src = resize_canvas.toDataURL("image/png");
    };

    const startMoving = (e: Evnt) => {
      e.preventDefault();
      e.stopPropagation();
      saveEventState(e);
      document.addEventListener("mousemove", moving);
      document.addEventListener("mouseup", endMoving);
    };

    const endMoving = (e: { preventDefault: () => void }) => {
      e.preventDefault();
      document.removeEventListener("mouseup", endMoving);
      document.removeEventListener("mousemove", moving);
    };

    const moving = function (e: {
      preventDefault: () => void;
      stopPropagation: () => void;
      clientX: any;
      clientY: any;
    }) {
      var mouse = { x: e.clientX, y: e.clientY },
        touches;
      e.preventDefault();
      e.stopPropagation();

      mouse.x = e.clientX;
      mouse.y = e.clientY;
      container.offset = {
        left: mouse.x - (event_state.mouse_pos_x - event_state.container_left),
        top: mouse.y - (event_state.mouse_pos_y - event_state.container_top),
      };
      container.style.left =
        mouse.x - (event_state.mouse_pos_x - event_state.container_left) + "px";
      container.style.top =
        mouse.y - (event_state.mouse_pos_y - event_state.container_top) + "px";
    };

    //Clear logic
    const clear = () => {
      let img_wrapper = document.querySelector(".resize-container");
      let result = document.querySelector(".result");
      let cropped = document.querySelectorAll(".cropped")
      img_wrapper?.remove();
      cropped?.forEach(el => el.remove());
    }

    const crop = () => {
      let overlay: any = document.querySelector(".overlay");
      //Finding the part of the image that is inside the crop box
      var crop_canvas,
        left = container.offset?overlay.offsetLeft - container.offset.left - 65:overlay.offsetLeft - event_state.container_left - 65,
        top = container.offset?overlay.offsetTop - container.offset.top - 65:overlay.offsetTop - event_state.container_top - 65,
        width = overlay.offsetWidth,
        height = overlay.offsetHeight;

      crop_canvas = document.createElement("canvas");
      crop_canvas.width = width;
      crop_canvas.height = height;
      let contextFor2d = crop_canvas.getContext("2d");

      contextFor2d?.drawImage(
        image_target,
        left,
        top,
        width,
        height,
        0,
        0,
        width,
        height
      );
      let img = crop_canvas.toDataURL("image/png");
      let result: any = document.querySelector(".result");
      var cropped_img = document.createElement("img");
      cropped_img.src = img;
      cropped_img.className = "cropped"
      let cropped = document.querySelectorAll(".cropped")
      cropped?.forEach(el => el.remove());
      result?.appendChild(cropped_img);
      result != null ? (result.style.display = "block") : null;
    };

    init();
  };

  handleDrop = (e: any): any => {
    e = e || window.event;
    if (e.preventDefault) {
      e.preventDefault();
    }
    let drop = document.querySelector(".component");
    let dTrans = e.dataTransfer;
    let filesDropped = dTrans.files;
    let file = filesDropped[0];
    let fileTypes = ['jpg', 'jpeg', 'png', 'svg', 'gif'];
    let extension = file.name.split('.').pop().toLowerCase();  //checking for file extension from input file
    let isSuccess = fileTypes.indexOf(extension) > -1;
    if(isSuccess){
      let reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = (e) => {
      let result = reader.result !== null ? reader.result : "";
      let img = document.createElement("img");
      img.className = "resize-image";
      img["src"] = JSON.parse(JSON.stringify(result));
      let oldImage = document.querySelectorAll(".resize-image");
      oldImage?.forEach(el => el.remove());
      drop !== null ? drop.appendChild(img) : null;
      this.resizeAndCrop(img);
    };
    }else{alert("The intended file is not an image!")}
    
    return false;
  };

  preventDragEvent(event: any): boolean {
    if (event.preventDefault) {
      event.preventDefault();
    }
    return false;
  }

  ngOnInit(): void {
    if (window.FileReader) {
      let drop = document.querySelector(".component");

      //Drop event initialization
      this.addEventHandler(drop, "dragover", this.preventDragEvent);
      this.addEventHandler(drop, "dragenter", this.preventDragEvent);
      this.addEventHandler(drop, "drop", this.handleDrop);
    } else {
      console.log("This browser does not support File Reader");
    }
  }
}
