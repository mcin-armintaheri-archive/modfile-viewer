import React, { Component } from 'react';

export const enhanceWithRefs = ({ didMount, didUpdate, willUnmount }) => {
  return WrappedComponent => {
    return class Enhanced extends Component {
      constructor(props) {
        super(props);
        this.nodeRefs = {};
      }
      componentDidMount() {
        this.props.setRefs instanceof Function && this.props.setRefs(this.refs);
        didMount instanceof Function && didMount.call(this);
      }
      componentDidUpdate() {
        this.updatePlot instanceof Function && this.updatePlot();
        didUpdate instanceof Function && didUpdate.call(this);
      }
      componentWillUnmount() {
        willUnmount instanceof Function && willUnmount.call(this);
      }
      render() {
        const { setRefs, ...restProps } = this.props;
        const propagateRefs = refs => {
          Object.assign(this.nodeRefs, refs);
          if (this.props.setRefs instanceof Function) {
            this.props.setRefs(this.nodeRefs);
          }
        }
        return (
          <WrappedComponent
            setRefs={propagateRefs}
            {...restProps}
          />
        );
      }
    }
  };
}
