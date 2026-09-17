import type { MomentaryRosMessageWidget } from "../widgetTypes";
import { COMMON_ROS_MESSAGE_TYPES } from "../rosMessageToggle/model";
import { buildMomentaryRosMessageCliExample } from "./model";

type MomentaryRosMessageFieldsProps = {
  widget: MomentaryRosMessageWidget;
  onChange: (next: MomentaryRosMessageWidget) => void;
};

const MESSAGE_TYPE_DATALIST_ID = "momentary-ros-message-type-options";

export function MomentaryRosMessageFields({
  widget,
  onChange,
}: MomentaryRosMessageFieldsProps) {
  return (
    <>
      <div className="controls-property-title">Momentary ROS Message</div>
      <div className="controls-hint">
        Publishes the pressed message while the button is held, then publishes the released message when the pointer or key is released.
      </div>
      <label className="controls-field">
        <span>Output Topic</span>
        <input
          className="editor-input"
          value={widget.topic}
          onChange={(event) =>
            onChange({
              ...widget,
              topic: event.target.value,
            })
          }
        />
      </label>
      <label className="controls-field">
        <span>ROS Message Type</span>
        <input
          className="editor-input"
          list={MESSAGE_TYPE_DATALIST_ID}
          value={widget.messageType}
          placeholder="std_msgs/msg/Bool"
          onChange={(event) =>
            onChange({
              ...widget,
              messageType: event.target.value,
            })
          }
        />
        <datalist id={MESSAGE_TYPE_DATALIST_ID}>
          {COMMON_ROS_MESSAGE_TYPES.map((messageType) => (
            <option key={messageType} value={messageType} />
          ))}
        </datalist>
      </label>
      <label className="controls-field">
        <span>Pressed Message Body</span>
        <textarea
          className="editor-input"
          rows={4}
          value={widget.pressedPayload}
          placeholder="{data: true}"
          onChange={(event) =>
            onChange({
              ...widget,
              pressedPayload: event.target.value,
            })
          }
        />
      </label>
      <label className="controls-field">
        <span>Released Message Body</span>
        <textarea
          className="editor-input"
          rows={4}
          value={widget.releasedPayload}
          placeholder="{data: false}"
          onChange={(event) =>
            onChange({
              ...widget,
              releasedPayload: event.target.value,
            })
          }
        />
      </label>
      <div className="controls-hint">
        CLI preview pressed: <code>{buildMomentaryRosMessageCliExample(widget, "pressed")}</code>
      </div>
      <div className="controls-hint">
        CLI preview released: <code>{buildMomentaryRosMessageCliExample(widget, "released")}</code>
      </div>
    </>
  );
}
